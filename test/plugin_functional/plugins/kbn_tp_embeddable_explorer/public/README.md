## Embeddable Explorer

These are functionally tested examples for how to build embeddables. In order
to see them render, start the functional test server in one terminal:

```
node scripts/functional_tests_server --config test/plugin_functional/config
```

and be sure to load the data

```
node scripts/es_archiver.js load dashboard/current/data
node scripts/es_archiver.js load dashboard/current/kibana
```

alternatively you can run them via

```
yarn start --plugin-path test/plugin_functional/plugins/kbn_tp_embeddable_explorer
```