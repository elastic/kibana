# Subscription status

Shows the subscription status badge in the Kibana header.

On Serverless, the badge appears when the organization is in trial (`cloud.serverless.organizationInTrial`). Billing admins get a popover with Subscribe and View pricing actions; other users get a tooltip asking them to contact their administrator. `cloud.isInTrial()` is not used because its `trial_end_date` fallback reports false positives.

The plugin registers the `subscription_status_badge_*` EBT event types. Event types can only be registered once, so new deployment types should add a resolver here rather than reporting the same events from another plugin.
