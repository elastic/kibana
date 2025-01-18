# Enable APM tracing on Fleet managed agent

1. Enroll agent with default config
2. Agent config will be overwritten by the Fleet Agent policy
3. Add APM config to the installed agent config file e.g. on Mac /Library/Elastic/Agent/elastic-agent.yml
```
agent.monitoring:
  traces: true
  apm:
    hosts:
      - <apm host url>
    environment: <apm environment>
    secret_token: <secret token>
```
4. Restart agent to pick up the changes (on standalone agent there is hot reload): https://www.elastic.co/guide/en/fleet/current/start-stop-elastic-agent.html
5. APM config should be applied, and traces should be sent to the APM server configured
6. Observe "APM instrumentation enabled" in the agent logs

More info in agent doc: https://github.com/elastic/elastic-agent/blob/main/docs/tracing.md

## Cloud configuration

- ECS uses the same methodology to add APM config on production builds (e.g. BC).
- Cloud logic that adds APM config: https://github.com/elastic/cloud/blob/master/scala-services/runner/src/main/scala/no/found/runner/allocation/stateless/ApmDockerContainer.scala#L434
- APM is not enabled by default on deployments with SNAPSHOT builds, see all conditions here: https://github.com/elastic/cloud/pull/124414

