### Dev agents

You can run a development fleet agent that is going to enroll and checkin every 3 seconds.
For this you can run the following command in the fleet pluging directory.

```
node scripts/dev_agent --enrollmentApiKey=<enrollmentApiKey> --kibanaUrl=http://localhost:5603/qed
```

To generate a dummy config and an enrollment enrollmentApiKey you can use this script

```
node scripts/dev_env_setup --kibanaUrl=http://localhost:5603/qed --kibanaUser=elastic --kibanaPassword=changeme
```

### Ingest endpoints

To spin up a mock server with ingest endpoints (policies, datasources, etc), run:

```
node scripts/mock_spec
```

#### Testing load

`artillery run x-pack/legacy/plugins/fleet/dev/load_testing/artillery.yml`
but edit for kibana path first...
