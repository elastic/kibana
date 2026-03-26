# Usage API

This plugin is used to report Usage metrics to our Cloud internal Usage API.

## Contract

At the moment, it only exposes the centralized configuration of the Usage API. The `setup` contract returns the `config` object with the following properties:

| API | Description |
|:----|:------------|
| `config.enabled` | Whether Kibana should report Usage metrics. |
| `config.url` | The full URL to report the metrics to. |
| `config.tls` | The TLS configuration to setup the HTTPS communication. |

### Recommendation

When listing this plugin as a dependency, always list it as an `optionalDependency`. It is disabled by default, so having a hard dependency on it can fail to initialize your plugin in Kibana.

### Future plans

Ideally, in the future, this plugin will hold the actual service that will push the metrics to the remote Usage API.
