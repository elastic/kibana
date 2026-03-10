---
name: activate-data-source
description: Activates a data source in a running Kibana instance by creating it via the Data Sources API. Use when asked to activate, connect, enable, or register a data source in Kibana.
allowed-tools: Bash, Read, Glob, Grep
argument-hint: [data-source-type]
---

# Activate a Data Source in Kibana

This skill creates a live data source instance in a running Kibana by calling the Data Sources API. The user wants to activate a **$ARGUMENTS** data source.

**CRITICAL: Never read, log, or display the contents of any credentials file. Credentials must only flow through the bundled scripts.**

## Step 1: List Available Data Source Types

Run the helper script to see what types are registered. This script auto-detects whether Kibana is running on http/https and with standard/serverless auth — no manual configuration needed.

```bash
x-pack/platform/plugins/shared/data_sources/.claude/skills/activate-data-source/scripts/list_types.sh
```

If the script reports that it cannot detect a running Kibana instance, stop and tell the user:
> Kibana does not appear to be running. Please start Elasticsearch and Kibana first:
> ```
> yarn es snapshot   # in one terminal
> yarn start         # in another terminal
> ```
> Then re-run this skill.

Match the user's argument (`$ARGUMENTS`) to one of the listed type IDs. If no exact match, show the user the available types and ask them to pick one.

## Step 2: Check for Existing Data Sources

Run the helper script to see what's already activated:

```bash
x-pack/platform/plugins/shared/data_sources/.claude/skills/activate-data-source/scripts/list_sources.sh
```

If a data source of the same type already exists, inform the user and ask if they want to create another one or stop.

## Step 3: Collect Credentials Securely

First, determine what credential the user needs to provide. Use the **Credential Reference** section below and the auth type info from Step 1's output to identify the correct format.

Then ask the user to write their credentials to a temporary file. Use the AskUserQuestion tool to present this request clearly, **including the specific credential type and format they need**.

For example, if activating a GitHub data source (bearer token):

> To activate GitHub, I need a **GitHub personal access token** (starts with `ghp_` or `github_pat_`).
>
> For security, please write it to a temporary file — I will **not** read this file. The activation script will read it and immediately delete it.
>
> Please run this in your terminal:
> ```
> echo -n 'ghp_your_token_here' > /tmp/ds_credentials
> ```
>
> Then let me know when the file is ready.

**Important:**
- NEVER read `/tmp/ds_credentials` or any credentials file the user creates
- NEVER use the Read tool on the credentials file
- NEVER `cat` or otherwise inspect the credentials file
- The `activate.sh` script handles reading and deleting it

## Credential Reference

Use this table to tell the user what credential to provide. The `credentials` string is mapped to connector secrets based on the auth type.

### MCP connectors (`.mcp` connector type)

The auth type is shown in the Step 1 output. The `credentials` string is mapped as follows:

| Auth Type | Credential Format | Example |
|-----------|-------------------|---------|
| `bearer` | A bearer/access token string | `ghp_abc123...` |
| `apiKey` | An API key string | `sk-abc123...` |
| `basic` | `username:password` | `admin:secretpass` |

### Connector-spec-v2 connectors (named connector types like `.notion`, `.google_drive`)

For these connectors, the auth type is defined in the connector spec at `src/platform/packages/shared/kbn-connector-specs/src/specs/`. Look up the spec to confirm, but here are the known types:

| Data Source | Connector Type | Auth Type | Credential to Provide |
|-------------|---------------|-----------|----------------------|
| **Notion** | `.notion` | Bearer token | Notion API integration token (starts with `secret_` or `ntn_`) |
| **GitHub** | `.mcp` | Bearer token | GitHub personal access token (`ghp_...` or `github_pat_...`) |
| **Google Drive** | `.google_drive` | Bearer token | Google OAuth 2.0 access token (`ya29.…`) |
| **SharePoint Online** | `.sharepoint-online` | OAuth Client Credentials | **Not a simple token** — requires OAuth client credentials flow (clientId, clientSecret, tenantId). This type may need to be configured through the Kibana UI instead. |

### For unknown / newly added data sources

If the data source type isn't listed above:
1. Check the connector spec: `grep -r "auth:" src/platform/packages/shared/kbn-connector-specs/src/specs/<connector_name>/`
2. Look for `types: ['bearer']`, `types: ['api_key_header']`, or `types: ['oauth_client_credentials']`
3. If bearer: the credential is a token string
4. If api_key_header: the credential is an API key string
5. If oauth_client_credentials: warn the user this may need UI-based setup

## Step 4: Activate the Data Source

Once the user confirms the credentials file is ready, run:

```bash
x-pack/platform/plugins/shared/data_sources/.claude/skills/activate-data-source/scripts/activate.sh \
  --type "<matched_type_id>" \
  --name "<display_name>" \
  --credentials-file /tmp/ds_credentials
```

Where:
- `<matched_type_id>` is the type ID from Step 1
- `<display_name>` is a human-readable name. **CRITICAL: This name MUST be lowercase** (e.g., `"tavily"`, `"github"`, `"notion"`). The name is used as the tool namespace, which is validated against a regex that only allows lowercase letters, numbers, hyphens, underscores, and dots. An uppercase name like `"Tavily"` will cause activation to fail with `Invalid namespace`.

The script will auto-detect the Kibana URL and auth, read the credentials, delete the file, and make the API call.

## Step 5: Verify Activation

Run the list script again to confirm:

```bash
x-pack/platform/plugins/shared/data_sources/.claude/skills/activate-data-source/scripts/list_sources.sh
```

Show the user the newly created data source entry. If it appears, report success. If not, show any error output from Step 4.

## Important Notes

- **This skill requires Kibana to be running** — it makes live API calls
- **Auto-detection** tries http/https on localhost:5601 with both `elastic:changeme` (standard) and `elastic_serverless:changeme` (serverless) credentials
- **Credentials are never seen by Claude** — they flow through the file → script → API pipeline only
- **The credentials file is deleted immediately** after the script reads it
- To override auto-detection, set `KIBANA_URL` and/or `KIBANA_AUTH` environment variables, or pass `--kibana-url` to the scripts
