# elastic-console-connect: Implementation Plan

Thin Slack routing service. Elastic hosts this. Receives Slack events, looks up the customer's
Kibana URL from the registry, forwards the event. All intelligence lives in the customer's Kibana.

---

## Architecture

```
                    ┌──────────────────────────────────────────┐
                    │         elastic-console-connect           │
                    │         (Elastic-hosted, Cloud Run)       │
                    │                                           │
Slack ──events────▶ │  POST /slack/events                       │
                    │    verify Slack signature                 │
                    │    lookup team_id → kibana_url + api_key  │
                    │    forward to Kibana ──────────────────────┼───▶ Customer's Kibana
                    │    Authorization: ApiKey <kibana_api_key> │      verifies API key natively
                    │                                           │
Customer ──OAuth──▶ │  GET /slack/oauth_redirect                │
                    │    exchange code → bot_token              │
                    │    push bot_token to Kibana               │
                    │    store team_id → kibana_url + api_key   │
                    │                                           │
                    │  Registry: Elastic's ES                   │
                    │  team_id → kibana_url + kibana_api_key    │
                    └──────────────────────────────────────────┘


                    ┌──────────────────────────────────────────┐
                    │    Customer's Kibana                      │
                    │    elastic_console plugin                 │
                    │                                           │
                    │  Verifies API key on /slack/events        │
                    │  Stores bot_token in encryptedSavedObjects│
                    │  Handles conversation lifecycle           │
                    │  Calls inference plugin for LLM           │
                    │  Posts responses back to Slack            │
                    │                                           │
                    │  Storage: Customer's ES                   │
                    │  Conversations + session state            │
                    └──────────────────────────────────────────┘
```

---

## Authentication Model

### Router → Kibana: Per-tenant Kibana API Key

Each customer's Kibana generates a scoped API key during the OAuth setup flow and embeds it
in the signed OAuth state. The router stores it alongside `kibana_url` and uses it as
`Authorization: ApiKey <key>` on every forwarded request.

Kibana verifies it natively — no custom auth code needed in the plugin.

**Why API Key over alternatives:**

| Option | Why rejected |
|---|---|
| Shared `ROUTER_SECRET` | Single breach exposes all tenants |
| JWT (router private key) | Works but adds key management overhead — API keys are native to Kibana |
| mTLS | TLS terminated at LB before Kibana — would need LB-level config, not plugin code |
| PASETO | Cleaner than JWT but ecosystem less mature, Kibana doesn't natively support it |

**Per-tenant isolation:** one compromised API key only affects one customer.
Customer can revoke/rotate independently via Kibana. Router stores the key but it is
scoped only to `POST /api/elastic_console/slack/events` — useless for anything else.

### Bot Token: Pushed to Kibana, Never Persisted in Router

During OAuth callback the router exchanges the code for a bot token, immediately pushes it
to the customer's Kibana (`POST /internal/elastic_console/slack/token`), then discards it.
Kibana stores it in `encryptedSavedObjects`. The router never persists the bot token.

```
OAuth callback:
  1. exchange code → bot_token (Slack API)
  2. POST ${kibana_url}/internal/elastic_console/slack/token
       Authorization: ApiKey <kibana_api_key>
       { bot_token }
  3. Kibana stores bot_token in encryptedSavedObjects
  4. Router discards bot_token — never written to registry

Event forwarding:
  Router → Kibana:  Authorization: ApiKey <kibana_api_key>  (no bot token)
  Kibana  → Slack:  loads bot_token from encryptedSavedObjects
```

---

## OAuth State Flow

Kibana initiates OAuth and embeds both the Kibana URL and a freshly-generated API key
in a signed JWT state parameter. The router reads these from the callback.

```
Kibana                             Router                        Slack
  │                                  │                             │
  │  1. generate scoped API key      │                             │
  │  2. sign JWT:                    │                             │
  │     { kibana_url, kibana_api_key}│                             │
  │     secret = SLACK_STATE_SECRET  │                             │
  │                                  │                             │
  │──── redirect with state ─────────────────────────────────────▶│
  │                                  │                             │
  │                                  │◀─── code + state ──────────│
  │                                  │                             │
  │                                  │  verify JWT                 │
  │                                  │  → kibana_url               │
  │                                  │  → kibana_api_key           │
  │                                  │  exchange code → bot_token  │
  │                                  │  push bot_token to Kibana   │
  │                                  │  store registry entry       │
  │                                  │  discard bot_token          │
  │                                  │                             │
  │◀─── redirect back ───────────────│                             │
```

---

## Repo Structure

```
elastic-console-connect/
├── src/
│   ├── index.ts                ← entry point
│   ├── app.ts                  ← Express app assembly
│   ├── config.ts               ← all env vars
│   ├── registry.ts             ← ES-backed workspace store
│   ├── lib/
│   │   ├── slack-verify.ts     ← Slack signature verification
│   │   └── forward.ts          ← forward events to Kibana
│   └── routes/
│       ├── events.ts           ← POST /slack/events
│       ├── oauth.ts            ← GET /slack/install + /slack/oauth_redirect
│       └── health.ts           ← GET /health
├── Dockerfile
├── package.json
└── README.md
```

---

## Environment Variables

```bash
# Slack app credentials (Elastic-owned app — from api.slack.com)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_STATE_SECRET=        # signs/verifies OAuth state JWT
SLACK_REDIRECT_URI=https://connect.elastic.co/slack/oauth_redirect

# Elastic's internal ES (workspace registry)
ES_URL=
ES_API_KEY=

PORT=3000
```

No `ROUTER_SECRET` — authentication is handled per-tenant via Kibana API keys.

---

## ES Registry Index

```json
{
  "index": "elastic-console-slack-registry",
  "mappings": {
    "properties": {
      "team_id":         { "type": "keyword" },
      "team_name":       { "type": "keyword" },
      "kibana_url":      { "type": "keyword" },
      "kibana_api_key":  { "type": "keyword", "index": false },
      "installed_at":    { "type": "date" },
      "updated_at":      { "type": "date" }
    }
  }
}
```

No `bot_token` in the registry — it lives in the customer's Kibana `encryptedSavedObjects`.

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/slack/events` | Receive Slack events, verify, forward to Kibana |
| `GET` | `/slack/install` | Direct install link (fallback for non-Kibana installs) |
| `GET` | `/slack/oauth_redirect` | OAuth callback — exchange code, register workspace |
| `GET` | `/health` | Health check |

---

## Route Logic

### `POST /slack/events`

```
1. verify Slack signature (X-Slack-Signature + X-Slack-Request-Timestamp)
   reject if older than 5 minutes (replay protection)
2. if body.type === 'url_verification' → return { challenge }
3. res.sendStatus(200)   ← ack immediately, always within 3 seconds
4. teamId = body.team_id ?? body.authorizations?.[0]?.team_id
5. workspace = await Registry.get(teamId)
6. if !workspace → log unknown team, return
7. if !workspace.kibana_url → sendOnboardingDm via Slack API, return
8. await forward(workspace.kibana_url, workspace.kibana_api_key, body)
```

### `GET /slack/oauth_redirect`

```
1. verify state JWT (SLACK_STATE_SECRET)
   → { kibana_url, kibana_api_key }
2. exchange code → bot_token
   POST https://slack.com/api/oauth.v2.access
3. push bot_token to Kibana:
   POST ${kibana_url}/internal/elastic_console/slack/token
     Authorization: ApiKey <kibana_api_key>
     { bot_token }
4. save to registry:
   { team_id, team_name, kibana_url, kibana_api_key }
   (no bot_token)
5. if kibana_url:
     redirect → ${kibana_url}/app/elastic-console?slack=connected
   else:
     sendOnboardingDm → "Go to Kibana to finish setup"
     render success page
```

---

## `src/config.ts`

```typescript
export const config = {
  port: process.env.PORT ?? 3000,

  slack: {
    clientId:         process.env.SLACK_CLIENT_ID!,
    clientSecret:     process.env.SLACK_CLIENT_SECRET!,
    signingSecret:    process.env.SLACK_SIGNING_SECRET!,
    stateSecret:      process.env.SLACK_STATE_SECRET!,
    oauthRedirectUri: process.env.SLACK_REDIRECT_URI!,
  },

  es: {
    url:    process.env.ES_URL!,
    apiKey: process.env.ES_API_KEY!,
  },
}
```

---

## `src/registry.ts`

```typescript
export interface WorkspaceEntry {
  team_id:        string
  team_name:      string
  kibana_url:     string | null
  kibana_api_key: string | null   // scoped to /api/elastic_console/slack/events only
  installed_at:   string
  updated_at:     string
}

export const Registry = {
  async get(teamId: string): Promise<WorkspaceEntry | null>,
  async save(entry: WorkspaceEntry): Promise<void>,
  async setKibanaUrl(teamId: string, kibanaUrl: string, apiKey: string): Promise<void>,
}
```

---

## `src/lib/slack-verify.ts`

```typescript
// HMAC-SHA256 verification against X-Slack-Signature header
// Rejects requests older than 5 minutes (replay protection)
export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  rawBody: string
): boolean
```

---

## `src/lib/forward.ts`

```typescript
// Forwards raw Slack event body to customer's Kibana
// Authenticates with per-tenant Kibana API key
// No bot_token — Kibana loads it from encryptedSavedObjects
export async function forwardToKibana(
  kibanaUrl: string,
  kibanaApiKey: string,
  body: unknown
): Promise<void> {
  await fetch(`${kibanaUrl}/api/elastic_console/slack/events`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `ApiKey ${kibanaApiKey}`,
      'kbn-xsrf':      'true',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
}
```

---

## Kibana Plugin Changes Required

The router alone is not enough. The `elastic_console` Kibana plugin also needs these additions.

### New Kibana endpoints

| Endpoint | Purpose |
|---|---|
| `POST /internal/elastic_console/conversations/:id/fork` | Clone conversation, seed with last response |
| `POST /internal/elastic_console/conversations/:id/locate` | Atomic ownership claim |
| `POST /internal/elastic_console/conversations/:id/handoff` | Return to origin, notify via connector |
| `POST /api/elastic_console/slack/events` | Receive forwarded events — verified via API key |
| `POST /internal/elastic_console/slack/token` | Receive bot_token from router, store encrypted |
| `GET /internal/elastic_console/slack/connect` | Initiate OAuth — generates API key, signs state JWT |

### New Kibana files

| File | Purpose |
|---|---|
| `server/routes/conversation_sessions.ts` | fork / locate / handoff |
| `server/lib/slack_client.ts` | Post/update Slack messages using stored bot_token |
| `server/lib/slack_handler.ts` | Core Slack event processing |
| `server/lib/notification_service.ts` | Generic connector-based notifications |
| `server/routes/slack_events.ts` | Inbound route — API key auth, calls slack_handler |
| `server/routes/slack_connect.ts` | OAuth initiation — generates API key, signs state JWT |
| `server/routes/slack_token.ts` | Receive and store bot_token from router |

### Key Kibana auth detail

`POST /api/elastic_console/slack/events` uses **standard Kibana API key auth** — no custom
verification code needed. The API key generated during setup is scoped to this endpoint only.

`POST /internal/elastic_console/slack/token` also requires the same API key — so only
the router (which holds the key) can push a bot token to Kibana.

---

## Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

### Cloud Run Configuration

```yaml
service:      elastic-console-connect
region:       us-central1
memory:       256Mi
cpu:          1
minInstances: 1      # always warm — Slack requires 200 within 3s
maxInstances: 20
```

---

## Customer Installation Flow

### Elastic Cloud (zero config)

```
1. Kibana → elastic-console → Settings → "Connect Slack"
2. Kibana generates scoped API key
3. Kibana signs JWT: { kibana_url, kibana_api_key }
4. Redirect to Slack OAuth
5. Customer clicks "Allow"
6. Router callback:
     - exchanges code → bot_token
     - pushes bot_token to Kibana (Authorization: ApiKey <kibana_api_key>)
     - stores team_id → kibana_url + kibana_api_key
     - discards bot_token
7. Redirect back to Kibana → "✅ Slack connected"
8. In Slack: /invite @elasticconsole to any channel
```

### Self-Managed

```
1. Customer finds "ElasticConsole" in Slack App Directory
   OR clicks "Connect Slack" in Kibana (same OAuth link)
2. Same OAuth flow as above
3. If installed from App Directory (no kibana_url in state):
   → Router sends onboarding DM: "Go to Kibana → Settings → Connect Slack"
   → Customer completes the link from Kibana
```

---

## Session Handoff Flow (End-to-End)

```
1. User @mentions @elasticconsole in Slack thread
   → Router looks up team_id → kibana_url + kibana_api_key
   → Forwards event to Kibana (Authorization: ApiKey ...)
   → Kibana loads bot_token from encryptedSavedObjects
   → Kibana creates conversation, streams LLM response
   → Kibana posts response back to Slack using bot_token

2. User says "fork"
   → Kibana creates child conversation
   → fork_context = last response (injected on first CLI turn)
   → origin_ref = 'channelId:thread_ts'
   → Posts session ID + instructions to Slack thread

3. Engineer picks it up:
   elastic-console --session <id>
   → POST /conversations/:id/locate { location: 'cli' }
   → receives fork_context, injects as first message context

4. Engineer calls handoff:
   POST /conversations/:id/handoff { summary: "Fixed X by doing Y" }
   → Kibana resets location → 'slack'
   → Kibana posts summary to original Slack thread via connector

5. Slack thread receives: "✅ Fixed X by doing Y — continuing here"
```

---

## Build Order

```
Step 1 — Kibana: Conversation Session API
  ├── conversation_storage.ts  (update state schema)
  └── conversation_sessions.ts (fork / locate / handoff)

Step 2 — Kibana: Slack Integration
  ├── slack_token.ts           (receive + store bot_token from router)
  ├── slack_connect.ts         (generate API key, sign state JWT)
  ├── slack_client.ts          (post to Slack using stored bot_token)
  ├── slack_handler.ts         (event processing)
  ├── notification_service.ts  (connector notifications)
  └── slack_events.ts          (inbound route, API key auth)
  └── ✓ Test locally with ngrok (no router needed at this stage)

Step 3 — This repo: elastic-console-connect
  ├── config.ts
  ├── registry.ts              (team_id → kibana_url + kibana_api_key, no bot_token)
  ├── lib/slack-verify.ts
  ├── lib/forward.ts           (Authorization: ApiKey <kibana_api_key>)
  ├── routes/health.ts
  ├── routes/oauth.ts          (push bot_token to Kibana, then discard)
  └── routes/events.ts

Step 4 — Deploy & wire up
  ├── Deploy to Cloud Run
  ├── Configure Slack app event URL → https://connect.elastic.co/slack/events
  └── End-to-end test: Slack → fork → CLI → handoff → Slack
```
