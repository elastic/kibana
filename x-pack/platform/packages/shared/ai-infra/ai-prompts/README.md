# @kbn/ai-prompts

Utility library for AI prompts that ship in Fleet content packages, so prompt changes reach
deployments without a Kibana release.

A content package carries prompts as saved objects in its `kibana/security_ai_prompt` folder, and
Fleet installs them as `security-ai-prompt` saved objects. The type keeps that name for every
solution because the package spec and already installed objects depend on it. The `inference`
plugin registers the type, so it exists in every solution.

`getPrompt` and `getPromptsByGroupId` read the installed prompt for a `promptGroupId` and
`promptId`, preferring an entry for the connector's provider and model, and fall back to the
`localPrompts` bundled with Kibana when the package is not installed.

| Package | `promptGroupId`s | Owner |
| --- | --- | --- |
| `security_ai_prompts` | Security Assistant, Attack Discovery, Defend Insights | `@elastic/security-generative-ai` |
| `nightshift_prompts` | `nightshift-investigations` | `@elastic/nightshift` |

The rest of this README describes the Security AI prompts workflow. Nightshift's workflow is in the
`nightshift_investigations` plugin README.

## Update prompts in Kibana

1. Update prompts in Kibana, located in either:
  - `x-pack/solutions/security/plugins/elastic_assistant/server/lib/prompt/local_prompt_object.ts`
  - `x-pack/solutions/security/plugins/elastic_assistant/server/lib/prompt/tool_prompts.ts`
  - `x-pack/solutions/security/plugins/elastic_assistant/server/lib/prompt/defend_insight_prompts.ts`

2. Uninstall the Security AI Prompts integration in Kibana. This will remove the saved objects from Kibana. The local prompts will be used, so now you can test your changes.
3. Once you've confirmed your changes, post your PR and run the evaluations in CI to confirm there are no regressions due to your prompt changes. The evals should be run with the prompt specific label in order to ensure the local prompts are used in the eval. The label is `ci:security-genai-run-evals-local-prompts`.
4. Once your PR is merged, you can regenerate the saved objects in Kibana and update the integration package. (See Developer Flow heading below)

## How to Update Prompt Saved Objects Content & Bump the Package Version

When updating Security AI Prompts saved objects in the `elastic/integrations` repository, follow these steps to regenerate content, update the integration package, and bump its version. Here is an example PR: https://github.com/elastic/integrations/pull/14171

---

### Ensure `elastic-package` is installed

1. **Clone the `elastic-package` repo:**

   ```bash
   git clone https://github.com/elastic/elastic-package.git
   cd elastic-package
   make build
   ```

2. **Add the binary to your path in `.zshrc`:**

   ```bash
   export PATH="/usr/local/go/bin:$PATH:/Users/stephmilovic/dev/elastic-package"
   ```

3. **In a new terminal, the `which` command should be able to find it:**

   ```bash
   ➜  ~ which elastic-package
   /Users/stephmilovic/dev/elastic-package/elastic-package
   ```

4. **Build `elastic-package` from the root before you begin:**

   ```bash
   ➜  ~ pwd
   /Users/stephmilovic/dev/elastic-package
   ➜  ~ make build
   ```
   
---

### Developer Flow: Updating Saved Objects Content

1. **Generate the latest prompt files in Kibana:**

   ```bash
   cd $KIBANA_HOME/x-pack/solutions/security/plugins/elastic_assistant
   pnpm generate-security-ai-prompts
   ```

2. **Copy the generated prompt files into the integration package:**

   ```bash
   cd $INTEGRATIONS_HOME/packages/security_ai_prompts/kibana/security_ai_prompt
   cp $KIBANA_HOME/target/security_ai_prompts/*.json .
   ```

---

### Bump the Package Version

1. **Open the `manifest.yml` for the integration:**

   ```bash
   cd $INTEGRATIONS_HOME/packages/security_ai_prompts
   ```

2. **Increment the `version:` field in `manifest.yml` following semantic versioning**  
   _(e.g., `0.0.1` → `0.0.2`)_

   > Use a **patch bump** for content-only changes like updated saved objects.

---

### Validate & Build the Integration Locally

1. **Run linting and build the package:**

   ```bash
   ➜  ~ pwd 
   /Users/stephmilovic/dev/integrations/packages/security_ai_prompts
   
   elastic-package lint
   elastic-package build
   ```

2. **Restart your local Elastic Stack with the updated package:**

   ```bash
   elastic-package stack down
   elastic-package stack up -d -v --services package-registry
   ```

---

### Test the Updated Package

1. Confirm the saved objects are included and working as expected by navigating to your Kibana instance and testing the integration. Ensure the following settings are in `kibana.dev.yml`:
   ```
   xpack.fleet.internal.registry.kibanaVersionCheckEnabled: false
   xpack.fleet.registryUrl: https://localhost:8080
   # Must match format_version in manifest.yml
   xpack.fleet.internal.registry.spec.max: '3.4'
   ```

2. Start Kibana with:
   ```
   NODE_EXTRA_CA_CERTS=~/.elastic-package/profiles/default/certs/kibana/ca-cert.pem pnpm start --no-base-path
   ```

3. Visit the Integration page and find Security AI Prompts (you may need to toggle Display beta integrations). Install it. Then go to the saved objects are to verify the saved objects have been installed and are what you expect. At this time, you can test your AI flow to ensure the updated prompt is being used, or use dev_tools to query for the prompt. For example:
   ```
   GET .kibana/_search
   {
     "query": {
       "bool": {
         "must": [
           { "term": { "type": "security-ai-prompt" }},
           { "term": { "security-ai-prompt.promptId": "defendInsights-incompatibleAntivirusRefine" }}
         ]
       }
     }
   }
   ```

---

##  Notes

- Commit both the updated saved objects **and** the updated `manifest.yml`.
- Include a meaningful changelog entry in `changelog.yml` (if your integration has one).

---

## Example `changelog.yml` Entry

If your integration uses a `changelog.yml`, add an entry like this:

```yaml
- version: "0.0.2"
  changes:
    - description: "Updated defend insights Security AI prompts."
      type: enhancement
```

