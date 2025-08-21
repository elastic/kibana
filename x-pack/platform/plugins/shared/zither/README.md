## Zither

Provides functionality that organize and manage tasks to run off the main thread in a central place.

Currently exposes the following tools;

- mlcEngine


### Development

Development is very much exactly like one would with any standard kibana plugin, with the only caveat that zither plugin state will be null whenever a hard refresh is performed, this is congruent with the service worker spec, pertaining to [hard refreshes](https://www.w3.org/TR/service-workers/#navigator-service-worker-controller).
