export declare const LOGSTASH_CONFIG_PIPELINES = "- pipeline.id: elastic-agent-pipeline\n  path.config: \"/etc/path/to/elastic-agent-pipeline.conf\"\n";
export declare function getLogstashPipeline(isSSLEnabled: boolean, apiKey?: string): string;
