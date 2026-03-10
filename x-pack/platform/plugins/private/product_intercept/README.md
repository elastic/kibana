## Product intercept plugin

This is a standalone plugin that leverages the intercept plugin to display product intercept used to gather information that is turn used to compute CSAT about user's experience of Kibana.

This plugin exposes no public APIs, but however exposes the following config

- `xpack.product_intercept.enabled`: Expects a boolean value, determines if the product intercept would be allowed to run given that the intercept plugin is enabled.

- `xpack.product_intercept.interval`: Expects a limited subset of duration string; (d,m,h,s) , denotes the cadence at which a user would be prompted to provide feedback about kibana

- `xpack.product_intercept.upgradeInterceptInterval`: Expects a limited subset of duration string; (d,m,h,s) , denotes the interval at which a user would be prompted to provide feedback about kibana after an upgrade event happens

- `xpack.product_intercept.trialInterceptInterval`: Expects a limited subset of duration string; (d,m,h,s) , denotes the interval at which a user would be prompted to provide feedback about kibana when the user is in trial

