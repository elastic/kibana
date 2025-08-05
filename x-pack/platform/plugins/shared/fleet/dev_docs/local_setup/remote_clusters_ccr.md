# Test sync integrations feature

## Architecture

This feature allows the user to sync the integrations installed on a "main" cluster (the local one, in this guide `Cluster A`) with a "remote" cluster (`Cluster B`).
In order to allow this synchronization, Cluster B needs to have Cluster B setup as a remote cluster and have [CCR](https://www.elastic.co/guide/en/elasticsearch/reference/current/ccr-getting-started-tutorial.html) enabled.

The synchronization happens via an async task (`SyncIntegrationsTask`) that populates the index `fleet-synced-integrations` on Cluster A with info related to remote ES output data and installed integrations data. Then the content of this index gets synced with the ccr index `fleet-synced-integrations-ccr-<remote-name>` on Cluster B. The basic architecture is shown in the diagram below:

![secret storage architecture](./diagrams/remote_clusters/remote_clusters.png)

The communication between clusters happens as follows:
- Kibana on Cluster B exposes the content of the ccr index on endpoints `GET api/fleet/remote_synced_integrations/status`
- Kibana on Cluster A exposes endpoint `/api/fleet/remote_synced_integrations/{outputId}/status` and exposes the status of the integrations sync in the UI

## Run ES and Kibana

### Changes to `kibana.dev.yml`

- Remove `elasticsearch.hosts`
- Enable feature flag

```
  xpack.fleet.enableExperimental: ['enableSyncIntegrationsOnRemote']
```

This configuration allows to run two local ES clusters in parallel, each one having its own instance of Kibana.

### Start Cluster B (remote)
- Start ES 1

```
yarn es snapshot -E http.port=9500 -E transport.port=9600 -E path.data=../remote --license trial -E http.host=0.0.0.0
```

Verify that node is healthy

```
  curl -k -u elastic:changeme http://localhost:9500
```

- Start Kibana 1

```
yarn start --server.port=5701 --elasticsearch.hosts=http://localhost:9500 --dev.basePathProxyTarget=5703
```
- Login into http://localhost/5701/<YOUR_PATH>

### Start Cluster A (main)

- Start ES 2

```
yarn es snapshot --license trial -E path.data=/tmp/es-data -E http.host=0.0.0.0
```
Note that `transport.port` defaults to `9300`

Verify that node is healthy:

```
curl -k -u elastic:changeme http://localhost:9200
```

- Start Kibana 2

```
yarn start
```

- Login into http://localhost/5601/<YOUR_PATH>

To avoid issues, it might be needed to login to one of the kibana instances with an incognito session.

## Setup on Cluster B

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
Save the responses as they will be required in Cluster A (see next section).

### Add Remote Cluster

- Add a Remote Cluster to Cluster B. Navigate to *Stack Management > Remote Clusters* ([link](http://localhost:5701/app/management/data/remote_clusters)) and follow the steps to add cluster 'local':

- Click "Add a remote cluster"
- Choose a name, put `localhost:9300` for "Seed nodes", and save (check "Yes, I have setup trust")
- Make sure the connection status is "Connected"

- Equivalent Dev Tools API request
```
PUT /_cluster/settings
{
  "persistent" : {
    "cluster" : {
      "remote" : {
        "local" : {
          "seeds" : [
            "localhost:9300"
          ]
        }
      }
    }
  }
}
```

### Set up CCR

Please note that [CCR](https://www.elastic.co/guide/en/elasticsearch/reference/current/ccr-getting-started-tutorial.html) requires both clusters to have the same license. At the time of writing an `enterprise` license is needed.
On cluster 1, navigate to *Stack Management > Cross-Cluster Replication* and create a follower index using the cluster from Step 1.

  - Leader index `fleet-synced-integrations`
  - Follower index `fleet-synced-integrations-ccr-remote1`

  - Equivalent Dev Tools API request

  ```
  PUT /fleet-synced-integrations-ccr-local/_ccr/follow
{
  "remote_cluster" : "local",
  "leader_index" : "fleet-synced-integrations"
}
  ```

### Set up local ES output
This configuration is required to kick off the integration sync. The local host needs to match the remote ES output configured on A (see next section). Note that `kibana.dev.yml` is read by both kibana instances so it's better to add it in the UI to avoid conflicts.

```
  name: 'ES output'
  type: 'elasticsearch'
  id: 'local-output'
  hosts: ["http://<local_ip>:9500"]
```

## Setup on Cluster A

### Add remote ES output
- Add remote ES output to Cluster A. Insert `token` and `key` obtained from the previous commands.
```
  name: 'Remote output'
  type: 'remote_elasticsearch'
  id: 'remote-output'
  hosts: ["http://<local_ip>:9500"]
  sync_integrations: true
  kibana_url: "http://localhost:5701"
  kibana_api_key: key
  secrets:
    service_token: token
```

## Verify sync

With these configuration, the sync task should run every 5 minutes and the integrations installed on Cluster B should be the same as the ones on Cluster A

### Check contents of sync integrations indices

- From Cluster B, verify that the follower index is active using the [follower info API](https://www.elastic.co/guide/en/elasticsearch/reference/current/ccr-get-follow-info.html):

```
GET fleet-synced-integrations-ccr-remote1/_ccr/info
```

Check content of ccr index:

```
GET fleet-synced-integrations-ccr-remote1/_search
```

- From Cluster A
```
GET fleet-synced-integrations/_search
```

### Read data from remote with CCS

- Enroll Fleet Server to Cluster A

- Create an Agent Policy in Cluster A and use remote output for integrations and monitoring

- Enroll an agent the above Agent policy in Cluster A

- Check data in Cluster B with [CCS](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-cross-cluster-search.html)

```
GET remote1:metrics-*/_search
```

## Cloud testing

- Create 2 deployments in https://console.qa.cld.elstc.co called main and remote
- Manage the deployments and add `xpack.fleet.enableExperimental: ['enableSyncIntegrationsOnRemote']` to kibana configuration to enable the feature flag

- On remote cluster:
  - Go to Stack Management / Remote Clusters
  - Add a remote cluster, use the proxy address of the main cluster (Find in manage deployment UI / Security / Proxy address at the bottom)  
  - Add a follower index in Cross Cluster Replication, leader index: `fleet-synced-integrations`, follower index: `fleet-synced-integrations-ccr-main`
  - Resume replication
- On main cluster:
  - Add a remote elasticsearch output to point to the remote cluster, fill out required fields (hosts, service_token) and enable sync integrations (fill kibana url and API key)
  - Monitor the integration sync status by clicking on the status badge in the outputs table
