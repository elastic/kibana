## URL drilldown

> NOTE: This plugin contains implementation of URL drilldown. For drilldowns infrastructure code refer to `ui_actions_enhanced` plugin.

Url drilldown allows navigating to external URL or to internal kibana URL.
By using variables in url template result url can be dynamic and depend on user's interaction.

URL drilldown has 3 sources for variables:

1. Global static variables like, for example, `kibanaUrl`. Such variables won’t change depending on a place where url drilldown is used.
2. Context variables are dynamic and different depending on where drilldown is created and used.
3. Event variables depend on a trigger context. These variables are dynamically extracted from the action context when drilldown is executed.

Difference between `event` and `context` variables, is that real `context` variables are available during drilldown creation (e.g. embeddable panel),
but `event` variables mapped from trigger context. Since there is no trigger context during drilldown creation, we have to provide some _mock_ variables for validating and previewing the URL.

In current implementation url drilldown has to be used inside the embeddable and with `ValueClickTrigger` or `RangeSelectTrigger`.

* `context` variables extracted from `embeddable`
* `event` variables extracted from `trigger` context

In future this basic url drilldown implementation would allow injecting more variables into `context` (e.g. `dashboard` app specific variables) and would allow providing support for new trigger types from outside.
This extensibility improvements are tracked here: https://github.com/elastic/kibana/issues/55324

In case a solution app has a use case for url drilldown that has to be different from current basic implementation and
just extending variables list is not enough, then recommendation is to create own custom url drilldown and reuse building blocks from `ui_actions_enhanced`.