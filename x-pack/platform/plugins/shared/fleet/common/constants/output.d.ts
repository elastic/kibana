import type { NewOutput, OutputType, ValueOf } from '../types';
export declare const OUTPUT_SAVED_OBJECT_TYPE = "ingest-outputs";
export declare const outputType: {
    readonly Elasticsearch: "elasticsearch";
    readonly Logstash: "logstash";
    readonly Kafka: "kafka";
    readonly RemoteElasticsearch: "remote_elasticsearch";
};
export declare const DEFAULT_OUTPUT_ID = "fleet-default-output";
export declare const DEFAULT_OUTPUT: NewOutput;
export declare const SERVERLESS_DEFAULT_OUTPUT_ID = "es-default-output";
export declare const ECH_AGENTLESS_OUTPUT_ID = "es-agentless-output";
export declare const SERVERLESS_AGENTLESS_OUTPUT_ID = "es-default-output-internal";
export declare const LICENCE_FOR_PER_POLICY_OUTPUT = "platinum";
export declare const LICENCE_FOR_OUTPUT_PER_INTEGRATION = "enterprise";
/**
 * Kafka constants
 */
export declare const kafkaCompressionType: {
    readonly None: "none";
    readonly Snappy: "snappy";
    readonly Lz4: "lz4";
    readonly Gzip: "gzip";
};
export declare const kafkaAuthType: {
    readonly Userpass: "user_pass";
    readonly Ssl: "ssl";
    readonly Kerberos: "kerberos";
    readonly None: "none";
};
export declare const kafkaConnectionType: {
    readonly Plaintext: "plaintext";
    readonly Encryption: "encryption";
};
export declare const kafkaSaslMechanism: {
    readonly Plain: "PLAIN";
    readonly ScramSha256: "SCRAM-SHA-256";
    readonly ScramSha512: "SCRAM-SHA-512";
};
export declare const kafkaPartitionType: {
    readonly Random: "random";
    readonly RoundRobin: "round_robin";
    readonly Hash: "hash";
};
export declare const kafkaTopicsType: {
    readonly Static: "static";
    readonly Dynamic: "dynamic";
};
export declare const kafkaTopicWhenType: {
    readonly Equals: "equals";
    readonly Contains: "contains";
    readonly Regexp: "regexp";
};
export declare const kafkaAcknowledgeReliabilityLevel: {
    readonly Commit: 1;
    readonly Replica: -1;
    readonly DoNotWait: 0;
};
export declare const kafkaVerificationModes: {
    readonly Full: "full";
    readonly None: "none";
    readonly Strict: "strict";
    readonly Certificate: "certificate";
};
export declare const kafkaSupportedVersions: string[];
export declare const RESERVED_CONFIG_YML_KEYS: string[];
export declare const kafkaTopicsOptions: ({
    id: "static";
    label: string;
    'data-test-subj': string;
} | {
    id: "dynamic";
    label: string;
    'data-test-subj': string;
})[];
export declare const KAFKA_DYNAMIC_FIELDS: string[];
export declare const OUTPUT_TYPES_WITH_PRESET_SUPPORT: Array<ValueOf<OutputType>>;
export declare const OUTPUT_HEALTH_DATA_STREAM = "logs-fleet_server.output_health-default";
export declare const LOGSTASH_API_KEY_CLUSTER_PERMISSIONS: string[];
export declare const LOGSTASH_API_KEY_INDICES_PRIVILEGES: string[];
export declare const LOGSTASH_API_KEY_INDICES: string[];
