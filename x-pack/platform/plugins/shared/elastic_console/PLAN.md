  ---
  Implementation Plan: elastic_console Kibana Plugin — Slack Integration

  ---
  Phase 1 — Conversation Session API

  Foundation. Everything else depends on this.

  1.1 Update conversation_storage.ts — map state fields

  state: types.object({
    dynamic: false,
    properties: {
      location:        types.keyword()   ← queryable
      origin_ref:      types.keyword()   ← queryable
      origin_location: types.keyword()   ← queryable
      fork_context:    types.text()
      connector_id:    types.keyword()
      located_at:      types.date()
      handoff_summary: types.text()
    }
  })

  1.2 New file server/routes/conversation_sessions.ts

  Three new endpoints:

  POST /internal/elastic_console/conversations/:id/fork
  body:     { origin_ref, origin_location, connector_id? }
  response: { id, fork_context }

  logic:
    - get parent conversation
    - fork_context = parent.conversation_rounds.at(-1).response.message
    - create new conversation with:
        conversation_rounds: []
        state: { fork_context, origin_ref, origin_location, connector_id, location: null }
    - return { id, fork_context }

  POST /internal/elastic_console/conversations/:id/locate
  body:     { location }
  response: { conversation, fork_context }

  logic:
    - get conversation
    - capture fork_context before clearing
    - detect first Slack→other transition → set origin fields
    - update state: { location, located_at, fork_context: null }
    - return { conversation, fork_context }

  POST /internal/elastic_console/conversations/:id/handoff
  body:     { summary? }
  response: { origin_location, origin_ref }

  logic:
    - get conversation
    - update state: { location: origin_location, handoff_summary: summary }
    - return { origin_location, origin_ref }
    - (Slack notification handled separately by the Slack handler)

  1.3 Register in server/routes/index.ts

  import { registerConversationSessionRoutes } from './conversation_sessions'
  registerConversationSessionRoutes({ router, coreSetup, logger })

  ---
  Phase 2 — Slack Integration

  2.1 Update kibana.jsonc — add encryptedSavedObjects

  "requiredPlugins": ["inference", "actions", "encryptedSavedObjects"]

  Needed to store the bot token securely.

  2.2 New file server/lib/slack_client.ts

  Thin wrapper around Slack Web API (raw fetch, no SDK):

  postMessage(botToken, { channel, thread_ts, text }) → ts
  updateMessage(botToken, { channel, ts, text })

  2.3 New file server/lib/slack_handler.ts

  Core event processing logic (mirrors motlp/bot handler):

  handleSlackEvent(event, botToken, coreStart):
    1. parse event type (app_mention, message.im)
    2. extract channel, thread_ts, text, user
    3. find or create conversation via state.origin_ref query
    4. detect commands: "fork" | "status" | "reset"
    5. for normal message:
         - post "..." placeholder to Slack
         - call chat completions (inference plugin directly, no HTTP)
         - stream chunks → throttled Slack updates
         - final update with full response
         - sync conversation_rounds to storage
    6. for "fork":
         - call fork logic
         - post session ID + instructions to thread

  Note: Call the inference plugin directly (not via HTTP) since we're inside Kibana:
  const client = inference.getClient({ request })
  client.chatComplete({ connectorId, messages, stream: true })

  2.4 New file server/routes/slack_events.ts

  POST /api/elastic_console/slack/events   (public access, not internal)

  - verify X-Elastic-Router-Secret header
  - handle url_verification challenge (for initial Slack setup)
  - ack immediately (setImmediate for async processing)
  - call slack_handler.handleSlackEvent

  2.5 New file server/routes/slack_connect.ts

  OAuth initiation — customer clicks "Connect Slack" in Kibana:

  GET /internal/elastic_console/slack/connect

  - get kibanaUrl from coreStart.http.basePath.publicBaseUrl
  - sign JWT: { kibana_url: kibanaUrl } with SHARED_SECRET + 10min expiry
  - redirect to:
      https://slack.com/oauth/v2/authorize
        ?client_id=ELASTIC_SLACK_CLIENT_ID
        &redirect_uri=https://router.elastic.co/slack/oauth_redirect
        &scope=app_mentions:read,chat:write,channels:history,im:write
        &state=<jwt>

  2.6 Register new routes in server/routes/index.ts

  import { registerSlackEventsRoute } from './slack_events'
  import { registerSlackConnectRoute } from './slack_connect'

  registerSlackEventsRoute({ router, coreSetup, logger })
  registerSlackConnectRoute({ router, coreSetup, logger })

  2.7 Update server/types.ts — expose encryptedSavedObjects

  import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server'

  export interface ElasticConsoleStartDependencies {
    inference: InferenceServerStart
    actions: ActionsPluginStart
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart  // ← add
  }

  ---
  Phase 3 — Config & Feature Flag

  3.1 Update server/config.ts

  export const configSchema = schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    slack: schema.maybe(schema.object({
      client_id: schema.string(),
      router_secret: schema.string(),   // shared secret with the router
    }))
  })

  3.2 Update server/plugin.ts — pass config to routes

  setup(coreSetup, setupDeps) {
    const config = this.context.config.get()
    registerRoutes({ router, coreSetup, logger, cloud: setupDeps.cloud, config })
  }

  ---
  Phase 4 — Local Testing (no router needed)

  Use ngrok to test end-to-end without building the router:

  # 1. Start Kibana locally
  yarn start

  # 2. Expose it via ngrok
  ngrok http 5601

  # 3. Create a dev Slack app at api.slack.com
  #    Event subscription URL: https://xxxx.ngrok.io/api/elastic_console/slack/events
  #    Bot scopes: app_mentions:read, chat:write, channels:history

  # 4. Set in kibana.dev.yml:
  #    xpack.elasticConsole.slack.router_secret: "dev-secret"

  # 5. In Slack — forward events directly (no JWT needed for dev)
  #    Just hardcode a test bot_token in slack_events.ts temporarily

  ---
  File Summary

  ┌────────────────────────────────────────┬────────┬────────────────────────────────────────┐
  │                  File                  │ Status │                  What                  │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/lib/conversation_storage.ts     │ Modify │ Map state fields                       │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/routes/conversation_sessions.ts │ New    │ fork / locate / handoff                │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/lib/slack_client.ts             │ New    │ Post/update Slack messages             │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/lib/slack_handler.ts            │ New    │ Core event processing                  │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/routes/slack_events.ts          │ New    │ POST /api/elastic_console/slack/events │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/routes/slack_connect.ts         │ New    │ GET OAuth initiation                   │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/routes/index.ts                 │ Modify │ Register new routes                    │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/types.ts                        │ Modify │ Add encryptedSavedObjects              │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/config.ts                       │ Modify │ Add slack config block                 │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ server/plugin.ts                       │ Modify │ Pass config to routes                  │
  ├────────────────────────────────────────┼────────┼────────────────────────────────────────┤
  │ kibana.jsonc                           │ Modify │ Add encryptedSavedObjects dep          │
  └────────────────────────────────────────┴────────┴────────────────────────────────────────┘

  ---
  Build Order

  1. conversation_storage.ts (schema)     ← no dependencies
  2. conversation_sessions.ts (routes)    ← depends on 1
  3. slack_client.ts                      ← no dependencies
  4. slack_handler.ts                     ← depends on 2 + 3
  5. slack_events.ts                      ← depends on 4
  6. slack_connect.ts                     ← standalone
  7. Wire everything in index.ts + plugin.ts
  8. Test with ngrok

  Start with step 1 — the schema change unblocks everything else.

  ---
  Known Tech Debt / Before Production

  ⚠️  Slack events auth — dev hack must be replaced before shipping

  Current (dev):
    slack_token.ts auto-generates a superuser API key (elastic:changeme) and stores it
    in ESO alongside bot_token. slack_events.ts injects it into the request headers for
    inference calls. This works but the key has full cluster access.

  Correct (production):
    1. slack_connect.ts already generates a scoped API key (privileges: api:elastic_console/slack/events)
       and embeds it in the JWT state sent to the router.
    2. The router stores the key and sends it as Authorization: ApiKey on every forwarded event.
    3. Change slack_events.ts route from authRequired: false → authRequired: 'optional'
       so the router's API key gets validated by Kibana's auth middleware.
    4. Remove the kibana_api_key stored in ESO — the request will already be authenticated.
    5. Remove the inferenceRequest fake request construction in slack_events.ts.
    6. Use request directly in handleSlackEvent — it's authenticated by the router's API key.

  Files to change:
    server/routes/slack_events.ts   — authRequired: 'optional', remove inferenceRequest hack
    server/routes/slack_token.ts    — remove API key generation
    server/plugin.ts                — remove kibana_api_key from SO mapping + ESO encrypted attrs
    server/lib/slack_credentials_so.ts — reset SO ID back to a stable value




  