# Subscription status

Shows the subscription status badge in the Kibana header.

The `subscriptionStatus.enabled` feature flag turns the badge off when set to `false`. It defaults to `true`, so the badge is on wherever the flag isn't served, for example locally and in CI. Disable it locally with `feature_flags.overrides.subscriptionStatus.enabled: false`.

On Serverless, the badge appears when the organization is in trial (`cloud.serverless.organizationInTrial`). Users with a Cloud billing URL get a popover with Subscribe and View pricing actions; others get a tooltip asking them to contact their administrator. For now users with the `superuser` or `admin` role get the billing URL, because Kibana can't check billing access yet ([kibana-team#4343](https://github.com/elastic/kibana-team/issues/4343)). `cloud.isInTrial()` is not used because its `trial_end_date` fallback reports false positives.

The plugin registers the `subscription_status_badge_*` EBT event types. Event types can only be registered once, so new deployment types should add a resolver here rather than reporting the same events from another plugin.
