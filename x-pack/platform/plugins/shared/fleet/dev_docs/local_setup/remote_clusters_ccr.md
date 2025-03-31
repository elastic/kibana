# Test sync integrations feature

## Changes to `kibana.dev.yml`

- Remove `elasticsearch.hosts`
- Enable feature flag
```
  xpack.fleet.enableExperimental: ['enableSyncIntegrationsOnRemote']
```


## Start Cluster 1 (remote)
- Start ES 1

```
yarn es snapshot -E http.port=9500 -E transport.port=9600 -E path.data=../remote --license trial -E http.host=0.0.0.0
```

- Start Kibana 1

```
yarn start --server.port=5701 --elasticsearch.hosts=http://localhost:9500 --dev.basePathProxyTarget=5703
```
- Login into http://localhost/5601/<YOUR_PATH>

## Start Cluster 2 (main)

- Start ES 2

```
yarn es snapshot --license trial -E path.data=/tmp/es-data -E http.host=0.0.0.0
```

- Start Kibana 2

```
yarn start
```

- Login into http://localhost/5701/<YOUR_PATH>

To avoid issues, it might be needed to login to one of the kibana instances with an incognito session.

## Setup on Cluster 1

- Navigate to dev tools and create service token and api key
```
POST kbn:/api/fleet/service_tokens
{
  "remote": true
}

POST /_security/api_key
  {
    "name": "integration_sync_api_key",
    "role_descriptors": {
      "integration_writer": {
        "cluster": [],
      "indices":[],
      "applications": [{
          "application": "kibana-.kibana",
            "privileges": ["feature_fleet.read", "feature_fleetv2.read"],
            "resources": ["*"]
        }]
      }
    }
  }
```
Save the responses as they will be required in Cluster 2 (see next section).

### Add Remote Cluster

- Add Remote Cluster to Cluster 1. Navigate to *Stack Management > Remote Clusters* ([link](http://localhost:5601/app/management/data/remote_clusters)) and follow the steps to add cluster 'local':

- Click "Add a remote cluster"
- Choose a name, put `localhost:9300` for "Seed nodes", and save (check "Yes, I have setup trust")
- Make sure the connection status is "Connected"

### Set up CCR

Please note that [CCR](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/ccr-getting-started-tutorial.html) requires both clusters to have the same license. At the time of writing an `enterprise` license is needed.
On cluster 1, navigate to *Stack Management > Cross-Cluster Replication* and create a follower index using the cluster from Step 1.

  - Leader index `fleet-synced-integrations`
  - Follower index `fleet-synced-integrations-ccr-remote1`

### Set up local ES output
This configuration is required to kick off the integration sync. The local host needs to match the remote ES output configured on Cluster 2 (see next section)

```
xpack.fleet.outputs:
  - name: 'Preconfigured ES output'
    type: 'elasticsearch'
    id: 'local-output'
    hosts: ["http://<local_ip>:9500"]
```

## Setup on Cluster 2
### Add remote ES output
- Add remote ES output to Cluster 2. Insert `token` and `key` obtained from the previous commands. This example is adding a preconfigured output but it can also be added from the UI.

```
xpack.fleet.outputs:
  - name: 'Preconfigured remote output'
    type: 'remote_elasticsearch'
    id: 'remote-output'
    hosts: ["http://<local_ip>:9500"]
    sync_integrations: true
    kibana_url: "http://localhost:5701"
    secrets:
      service_token: token
      kibana_api_key: key
```

## Verify sync

With these configuration, the sync task should run every 5 minutes and the integrations installed on Cluster 1 should be the same as the ones on Cluster 2

### Check contents of sync integrations indices

- In Cluster 1
```
GET fleet-synced-integrations-ccr-remote1/_search
```

- In Cluster 2
```
GET fleet-synced-integrations/_search
```

### Read data from remote with CCS

- Enroll Fleet Server to Cluster 2

- Create Agent Policy in Cluster 2 and use remote output for integrations and monitoring

- Enroll Agent to Cluster 2 to the Agent policy

- Check data in Cluster 1 with CCS

```
GET remote1:metrics-*/_search
```