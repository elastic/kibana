# Third party Lens visualization

To run this example plugin, use the command `yarn start --run-examples`.

This example shows how to register a visualization to Lens which lives along the regular visualizations (xy, table and so on).

The following parts can be seen in this example:
* Registering the visualization type so it shows up in the Lens editor along with custom edit UI and hooks to update state on user interactions (add dimension, delete dimension).
* Registering the used expression functions and expression renderers to actually render the expression into a DOM element.
* Providing a sample migration on the Kibana server which allows to update existing stored visualizations and change their state on Kibana upgrade / import of old saved objects.


To test the migration, you can import the following ndjson file via saved object import (requires installed logs sample data):
<details>
  <summary>Click to expand</summary>

```
{"attributes":{"fieldFormatMap":"{\"hour_of_day\":{}}","runtimeFieldMap":"{\"hour_of_day\":{\"type\":\"long\",\"script\":{\"source\":\"emit(doc['timestamp'].value.getHour());\"}}}","timeFieldName":"timestamp","title":"kibana_sample_data_logs"},"coreMigrationVersion":"8.0.0","id":"90943e30-9a47-11e8-b64d-95841ca0b247","migrationVersion":{"index-pattern":"8.0.0"},"references":[],"type":"index-pattern","updated_at":"2022-01-24T10:54:24.209Z","version":"WzQzMTQ3LDFd"}
{"attributes":{"description":"","state":{"datasourceStates":{"indexpattern":{"layers":{"f2700077-50bf-48e4-829c-f695f87e226d":{"columnOrder":["5e704cac-8490-457a-b635-01f3a5a132b7"],"columns":{"5e704cac-8490-457a-b635-01f3a5a132b7":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"}},"incompleteColumns":{}}}}},"filters":[],"query":{"language":"kuery","query":""},"visualization":{"column":"5e704cac-8490-457a-b635-01f3a5a132b7","layerId":"f2700077-50bf-48e4-829c-f695f87e226d"}},"title":"Rotating number test","visualizationType":"rotatingNumber"},"coreMigrationVersion":"8.0.0","id":"468f0be0-7e86-11ec-9739-d570ffd3fbe4","migrationVersion":{"lens":"8.0.0"},"references":[{"id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-current-indexpattern","type":"index-pattern"},{"id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-f2700077-50bf-48e4-829c-f695f87e226d","type":"index-pattern"}],"type":"lens","updated_at":"2022-01-26T08:59:31.618Z","version":"WzQzNjUzLDFd"}
{"excludedObjects":[],"excludedObjectsCount":0,"exportedCount":2,"missingRefCount":0,"missingReferences":[]}
```

</details>