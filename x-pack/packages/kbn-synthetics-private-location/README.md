# @kbn/synthetics-private-location

Quickily start Fleet, enroll Elastic Agent, and create a private location.

## Usage

```
node x-pack/scripts/synthetics_private_location.js
```

For available options, run `--help`.

## Prerequistes

This script requires `docker` and the following `kibama.yml` configuration.

```
# Create an agent policy for Fleet Server.
xpack.fleet.agentPolicies:
  - name: Fleet Server policy
    id: fleet-server-policy
    is_default_fleet_server: true
    # is_managed: true # Useful to mimic cloud environment
    description: Fleet server policy
    namespace: default
    package_policies:
      - name: Fleet Server
        package:
          name: fleet_server
        inputs:
          - type: fleet-server
            keep_enabled: true
            vars:
              - name: host
                value: 0.0.0.0
                frozen: true
              - name: port
                value: 8220
                frozen: true

# Set a default Fleet Server host.
xpack.fleet.fleetServerHosts:
  - id: default-fleet-server
    name: Default Fleet server
    is_default: true
    host_urls: ['https://host.docker.internal:8220'] # For running a Fleet Server Docker container

# Set a default Elasticsearch output.
xpack.fleet.outputs:
  - id: es-default-output
    name: Default output
    type: elasticsearch
    is_default: true
    is_default_monitoring: true
    hosts: ['http://host.docker.internal:9200'] # For enrolling dockerized agents
```
