# Subscription status

Shows the subscription status badge in the Kibana header.

The `subscriptionStatus.enabled` feature flag turns the badge off when set to `false`. It defaults to `true`, so the badge is on wherever the flag isn't served, for example locally and in CI. Disable it locally with `feature_flags.overrides.subscriptionStatus.enabled: false`.

Self-managed admins turn the badge off with `xpack.subscription_status.enabled: false` in `kibana.yml`, which disables the whole plugin. The server plugin exists only to define this setting.

On Serverless, the badge appears when the organization is in trial (`cloud.serverless.organizationInTrial`). Users with a Cloud billing URL get a popover with Subscribe and View pricing actions; others get a tooltip asking them to contact their administrator. For now users with the `superuser` or `admin` role get the billing URL, because Kibana can't check billing access yet ([kibana-team#4343](https://github.com/elastic/kibana-team/issues/4343)). `cloud.isInTrial()` is not used because its `trial_end_date` fallback reports false positives.

On self-managed (`cloud.isCloudEnabled` is false, which includes ECK but not ECE), the badge follows the Elasticsearch license from `licensing.license$`:

- Active trial: a meter of the trial used, the days left and the expiry date. From 3 days left the badge and meter turn to the warning color.
- Expired trial: a warning badge. Non-admins are asked to contact their admin. The licensing plugin's expired-license banner still shows.
- Basic: an outlined badge.
- Standard, Gold, Platinum, and Enterprise: no badge.

Users with License Management access (`management.stack.license_management`, the `manage` cluster privilege) get a Manage license action that opens License Management. Everyone else gets Start a cloud trial. Everyone also gets Compare license features, which links to the Elastic subscriptions page. In the classic header the badge sits on the dark top bar in the app's color mode, like the user menu.

The plugin registers the `subscription_status_badge_*` EBT event types. Event types can only be registered once, so new deployment types should add a resolver here rather than reporting the same events from another plugin.
