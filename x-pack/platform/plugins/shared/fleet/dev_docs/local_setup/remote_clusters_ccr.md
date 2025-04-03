# Test sync integrations feature 

## Start Cluster 1 (remote)

- Start ES 1

```
yarn es snapshot -E http.port=9500 -E transport.port=9600 -E path.data=../remote --license trial -E http.host=0.0.0.0
```

- Start Kibana 1

```
yarn start --server.port=5701 --elasticsearch.hosts=http://localhost:9500 --dev.basePathProxyTarget=5703
```

## Start Cluster 2 (main)

- Start ES 2

```
yarn es snapshot --license trial -E path.data=/tmp/es-data -E http.host=0.0.0.0
```

- Start Kibana 2

```
yarn start
```

## Enable feature flag

- Add to `kibana.dev.yml`

```
xpack.fleet.enableExperimental: ['enableSyncIntegrationsOnRemote']
```

## Add remote ES output
- Add remote ES output to Cluster 2

```
xpack.fleet.outputs:
  - name: 'Preconfiged remote output'
    type: 'remote_elasticsearch'
    id: 'remote-output'
    hosts: ["http://<local_ip>:9500"]
    sync_integrations: true
    kibana_url: "http://localhost:5701"
    secrets:
      service_token: token
      kibana_api_key: key
```

## Add Remote Cluster

- Add Remote Cluster to Cluster 1

http://localhost:5701/app/management/data/remote_clusters 

Add Remote cluster with remote address `localhost:9300`

## Set up CCR

- Add follower index to Cluster 1
  - Leader index `fleet-synced-integrations`
  - Follower index `fleet-synced-integrations-ccr-remote1`


## Check contents of sync integrations indices

- In Cluster 1
```
GET fleet-synced-integrations-ccr-remote1/_search
```

- In Cluster 2
```
GET fleet-synced-integrations/_search
```

## Read data from remote with CCS

- Enroll Fleet Server to Cluster 2

- Create Agent Policy in Cluster 2 and use remote output for integrations and monitoring

- Enroll Agent to Cluster 2 to the Agent policy

- Check data in Cluster 1 with CCS

```
GET remote1:metrics-*/_search
```