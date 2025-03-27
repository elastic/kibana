## Product intercept plugin

Contains business logic and orchestration for display the product intercept dialog suited to the needs of Kibana.

Does not expose any public apis, for consumption at this moment.

Exposes the following config

- `xpack.product_intercept.enabled`: Expects boolean value, denotes if product intercept will run
- `xpack.product_intercept.interval`: Expects a limited subset of duration string; (d,m,h,s) , denotes the cadence at which a user would be prompted to provide feedback about kibana