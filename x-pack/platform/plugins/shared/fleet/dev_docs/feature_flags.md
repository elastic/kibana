# Feature flags in Fleet

Use Kibana feature flags to gate functionality in Fleet. The [Kibana feature flag service](https://docs.elastic.dev/kibana-dev-docs/tutorials/feature-flags-service) itself (registration, overrides, LaunchDarkly targeting) is documented in the Kibana developer docs and is not repeated here.

Fleet also has legacy experimental features (`allowedExperimentalValues` in [`common/experimental_features.ts`](../common/experimental_features.ts), configured via `xpack.fleet.experimentalFeatures`). Do not add new entries there: a test fails if a new key is added. Existing entries remain supported until removed.

## Kibana feature flags

### 1. Add the flag in the kibana-feature-flags repo

Create the flag in the [elastic/kibana-feature-flags](https://github.com/elastic/kibana-feature-flags) repo first, see [this example PR](https://github.com/elastic/kibana-feature-flags/pull/238). Default values can be set per environment (for example enabled in qa/staging and disabled in production), so a feature can be rolled out gradually.

### 2. Declare the flag name in Fleet

Add a constant to [`common/constants/feature_flags.ts`](../common/constants/feature_flags.ts), with a doc comment stating what it gates and the fallback:

```ts
/** LaunchDarkly flag that gates the Restart Agent action in the Fleet UI. Fallback is false. */
export const ENABLE_RESTART_AGENT_ACTION_FLAG = 'fleet.enableRestartAgentAction';
```

Conventions:

- Flag names are prefixed with `fleet.`.
- Always pass an explicit fallback (usually `false`) so the feature stays off if the flag service or LaunchDarkly is unavailable.

### 3. Read the flag

**Public (browser)**: use `featureFlags` from `useStartServices()`. Wrap it in a small hook, see [`use_restart_agent_action.ts`](../public/hooks/use_restart_agent_action.ts):

```ts
const { featureFlags } = useStartServices();
const isEnabled = featureFlags.useBooleanValue(ENABLE_RESTART_AGENT_ACTION_FLAG, false);
```

**Server**: use `appContextService.getFeatureFlags()` and the observable API, see [`iac_provisioner.ts`](../server/services/utils/iac_provisioner.ts):

```ts
const featureFlags = appContextService.getFeatureFlags();
if (!featureFlags) return false;
return await firstValueFrom(featureFlags.getBooleanValue$(ENABLE_IAC_PROVISIONER_FLAG, false));
```

Handle the case where `getFeatureFlags()` returns `undefined`.

### 4. Test

Mock `useBooleanValue` (public) or `getBooleanValue$` (server) and assert it is called with the flag constant and the expected fallback. See [`use_iac_provisioner.test.ts`](../public/hooks/use_iac_provisioner.test.ts) and [`iac_provisioner.test.ts`](../server/services/utils/iac_provisioner.test.ts).

### Local development

Override flags in `config/kibana.dev.yml` using the Kibana feature flag overrides setting (see the [Kibana feature flag service docs](https://docs.elastic.dev/kibana-dev-docs/tutorials/feature-flags-service)), for example:

```yaml
feature_flags.overrides:
  fleet.enableRestartAgentAction: true
```

To toggle a flag on a running Kibana without restarting, use Dev Tools and reload the page afterwards:

```
PUT kbn:/internal/core/_settings
{
  "feature_flags.overrides": {
    "fleet.enableRestartAgentAction": true
  }
}
```

### Viewing flags in use

There is a dashboard per environment (for example [QA](https://overview.qa.cld.elstc.co/app/dashboards#/view/dashboard-serverless-kibana-feature-flags)) in the overview cluster that shows which Kibana feature flags are in use.

## Limitations

Kibana feature flags are evaluated at runtime, and are not available at registration time during plugin setup. There is no equivalent for gating things that must be decided when the plugin is set up, such as registering new saved object types or conditionally registering features. For those cases, a Kibana feature flag cannot be used and the legacy experimental features are still needed (add the key to the frozen list in `common/experimental_features.test.ts` on purpose, and explain why in the PR). Current examples are `useSpaceAwareness`, and `enableAgentlessPoliciesUI` together with `disableAgentlessLegacyAPI`.
