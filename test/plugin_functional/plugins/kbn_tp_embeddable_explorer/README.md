## Embeddable Explorer

This is a functionally tested set of Embeddable API examples.

To get started, run 

```
> yarn es snapshot
```

in one terminal, and in another:

```
> yarn start
```

If you would like the dashboard examples to load, you must include the test data by running:

```
> node scripts/es_archiver.js load dashboard/current/kibana --es-url http://localhost:9200 --kibana-url http://localhost:5601/[BASE_PATH_HERE]
> node scripts/es_archiver.js load dashboard/current/data --es-url http://localhost:9200 --kibana-url http://localhost:5601/[BASE_PATH_HERE]
```

Then open up Kibana, navigate to the embeddable explorer app, and have fun!