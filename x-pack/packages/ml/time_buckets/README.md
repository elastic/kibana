# @kbn/ml-time-buckets

`TimeBuckets` is a helper class for wrapping the concept of an "Interval", which describes a timespan that will separate buckets of time, for example the interval between points on a time series chart.

Back in 2019 for Kibana New Platform it was decided that the original `TimeBuckets` would not longer be exposed from Kibana itself, it was therefor copied over to the `ml` plugin (see https://github.com/elastic/kibana/issues/44249). Over time, before we had the package system, several copies of this class spread over more plugins. All these usage are now consolidated into this package.

In the meantime, the original `TimeBuckets` class has been reworked and migrated to TS (https://github.com/elastic/kibana/issues/60130). In contrast to the original idea, it is again available as an export from Kibana's `data` plugin. Because of this we might want to look into using the original `TimeBuckets` again if it solves our use cases.
