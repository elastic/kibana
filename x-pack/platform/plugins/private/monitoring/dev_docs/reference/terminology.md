# Terminology

#### Internal collection

The process of collecting monitoring data handled by the stack components themselves. Each component is responsible for sending documents to elasticsearch directly.

#### Metricbeat collection

The process of collecting monitoring data using metricbeat. Each component exposes an endpoint that metricbeat queries using a module for that component. Metricbeat then sends the data to elasticsearch for all monitored components.

#### Production deployment

The deployment that receives customer service data, as distinguished from [monitoring deployment](#monitoring-deployment). For example, given two deployments:

- A: the deployment that stores the customer's service observability data
- B: the deployment that stores the monitoring data

The production deployment will be "A" and the "monitoring" deployment will be "B".

If the deployment is [self-monitoring](#self-monitoring), then the production deployment is the same as the monitoring deployment.

#### Monitoring deployment

The deployment that receives stack monitoring data from the production deployment(s), as distinguished from the [production deployment](#production-deployment).

#### Self-monitoring

The practice of storing stack monitoring data in the same deployment as the customer service observability data.

This is useful for testing and development, but not recommended for production.

This is because you typically need the monitoring data when the production deployment is down or slow to ingest. If they're the same deployment, the monitoring data will be unavailable as well and useless for troubleshooting.

#### Standalone Cluster

A "fake" cluster in stack monitoring used to group any component metrics that are not associated with a cluster UUID (`cluster_uuid: ''`).

The Stack Monitoring UI is built around the idea of an Elasticsearch cluster and showing all the products which publish into that cluster. Some stack components (Logstash and Beats) can work fine without an Elasticsearch cluster and are often used this way. The "Standalone Cluster" allows us to monitor components running in that mode.