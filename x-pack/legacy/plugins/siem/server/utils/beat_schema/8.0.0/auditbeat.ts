/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * An instance of the unmodified schema exported from auditbeat-8.0.0-SNAPSHOT-darwin-x86_64.tar.gz
 *
 */

import { Schema } from '../type';

export const auditbeatSchema: Schema = [
  {
    key: 'ecs',
    title: 'ECS',
    description: 'ECS fields.',
    fields: [
      {
        name: '@timestamp',
        type: 'date',
        level: 'core',
        required: true,
        example: '2016-05-23T08:05:34.853Z',
        description:
          'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
      },
      {
        name: 'tags',
        level: 'core',
        type: 'keyword',
        example: '["production", "env2"]',
        description: 'List of keywords used to tag each event.',
      },
      {
        name: 'labels',
        level: 'core',
        type: 'object',
        example: {
          env: 'production',
          application: 'foo-bar',
        },
        description:
          'Key/value pairs. Can be used to add meta information to events. Should not contain nested objects. All values are stored as keyword. Example: `docker` and `k8s` labels.',
      },
      {
        name: 'message',
        level: 'core',
        type: 'text',
        example: 'Hello World',
        description:
          'For log events the message field contains the log message. In other use cases the message field can be used to concatenate different values which are then freely searchable. If multiple messages exist, they can be combined into one message.',
      },
      {
        name: 'agent',
        title: 'Agent',
        group: 2,
        description:
          'The agent fields contain the data about the software entity, if any, that collects, detects, or observes events on a host, or takes measurements on a host. Examples include Beats. Agents may also run on observers. ECS agent.* fields shall be populated with details of the agent running on the host or observer where the event happened or the measurement was taken.',
        footnote:
          'Examples: In the case of Beats for logs, the agent.name is filebeat. For APM, it is the agent running in the app/service. The agent information does not change if data is sent through queuing systems like Kafka, Redis, or processing systems such as Logstash or APM Server.',
        type: 'group',
        fields: [
          {
            name: 'version',
            level: 'core',
            type: 'keyword',
            description: 'Version of the agent.',
            example: '6.0.0-rc2',
          },
          {
            name: 'name',
            level: 'core',
            type: 'keyword',
            description:
              'Name of the agent. This is a name that can be given to an agent. This can be helpful if for example two Filebeat instances are running on the same host but a human readable separation is needed on which Filebeat instance data is coming from. If no name is given, the name is often left empty.',
            example: 'foo',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description:
              'Type of the agent. The agent type stays always the same and should be given by the agent used. In case of Filebeat the agent would always be Filebeat also if two Filebeat instances are run on the same machine.',
            example: 'filebeat',
          },
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description:
              'Unique identifier of this agent (if one exists). Example: For Beats this would be beat.id.',
            example: '8a4f500d',
          },
          {
            name: 'ephemeral_id',
            level: 'extended',
            type: 'keyword',
            description:
              'Ephemeral identifier of this agent (if one exists). This id normally changes across restarts, but `agent.id` does not.',
            example: '8a4f500f',
          },
        ],
      },
      {
        name: 'client',
        title: 'Client',
        group: 2,
        description:
          'A client is defined as the initiator of a network connection for events regarding sessions, connections, or bidirectional flow records. For TCP events, the client is the initiator of the TCP connection that sends the SYN packet(s). For other protocols, the client is generally the initiator or requestor in the network transaction. Some systems use the term "originator" to refer the client in TCP connections. The client fields describe details about the system acting as the client in the network event. Client fields are usually populated in conjunction with server fields.  Client fields are generally not populated for packet-level events. Client / server representations can add semantic context to an exchange, which is helpful to visualize the data in certain situations. If your context falls in that category, you should still ensure that source and destination are filled appropriately.',
        type: 'group',
        fields: [
          {
            name: 'address',
            level: 'extended',
            type: 'keyword',
            description:
              'Some event client addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'IP address of the client. Can be one or multiple IPv4 or IPv6 addresses.',
          },
          {
            name: 'port',
            level: 'core',
            type: 'long',
            description: 'Port of the client.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the client.',
          },
          {
            name: 'domain',
            level: 'core',
            type: 'keyword',
            description: 'Client domain.',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            example: 184,
            description: 'Bytes sent from the client to the server.',
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            example: 12,
            description: 'Packets sent from the client to the server.',
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'cloud',
        title: 'Cloud',
        group: 2,
        description: 'Fields related to the cloud or infrastructure the events are coming from.',
        footnote:
          'Examples: If Metricbeat is running on an EC2 host and fetches data from its host, the cloud info contains the data about this machine. If Metricbeat runs on a remote machine outside the cloud and fetches data from a service running in the cloud, the field contains cloud data from the machine the service is running on.',
        type: 'group',
        fields: [
          {
            name: 'provider',
            level: 'extended',
            example: 'ec2',
            type: 'keyword',
            description:
              'Name of the cloud provider. Example values are ec2, gce, or digitalocean.',
          },
          {
            name: 'availability_zone',
            level: 'extended',
            example: 'us-east-1c',
            type: 'keyword',
            description: 'Availability zone in which this host is running.',
          },
          {
            name: 'region',
            level: 'extended',
            type: 'keyword',
            example: 'us-east-1',
            description: 'Region in which this host is running.',
          },
          {
            name: 'instance.id',
            level: 'extended',
            type: 'keyword',
            example: 'i-1234567890abcdef0',
            description: 'Instance ID of the host machine.',
          },
          {
            name: 'instance.name',
            level: 'extended',
            type: 'keyword',
            description: 'Instance name of the host machine.',
          },
          {
            name: 'machine.type',
            level: 'extended',
            type: 'keyword',
            example: 't2.medium',
            description: 'Machine type of the host machine.',
          },
          {
            name: 'account.id',
            level: 'extended',
            type: 'keyword',
            example: 666777888999,
            description:
              'The cloud account or organization id used to identify different entities in a multi-tenant environment. Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
          },
        ],
      },
      {
        name: 'container',
        title: 'Container',
        group: 2,
        description:
          'Container fields are used for meta information about the specific container that is the source of information. These fields help correlate data based containers from any runtime.',
        type: 'group',
        fields: [
          {
            name: 'runtime',
            level: 'extended',
            type: 'keyword',
            description: 'Runtime managing this container.',
            example: 'docker',
          },
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description: 'Unique container id.',
          },
          {
            name: 'image.name',
            level: 'extended',
            type: 'keyword',
            description: 'Name of the image the container was built on.',
          },
          {
            name: 'image.tag',
            level: 'extended',
            type: 'keyword',
            description: 'Container image tag.',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Container name.',
          },
          {
            name: 'labels',
            level: 'extended',
            type: 'object',
            object_type: 'keyword',
            description: 'Image labels.',
          },
        ],
      },
      {
        name: 'destination',
        title: 'Destination',
        group: 2,
        description:
          'Destination fields describe details about the destination of a packet/event. Destination fields are usually populated in conjunction with source fields.',
        type: 'group',
        fields: [
          {
            name: 'address',
            level: 'extended',
            type: 'keyword',
            description:
              'Some event destination addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description:
              'IP address of the destination. Can be one or multiple IPv4 or IPv6 addresses.',
          },
          {
            name: 'port',
            level: 'core',
            type: 'long',
            description: 'Port of the destination.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the destination.',
          },
          {
            name: 'domain',
            level: 'core',
            type: 'keyword',
            description: 'Destination domain.',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            example: 184,
            description: 'Bytes sent from the destination to the source.',
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            example: 12,
            description: 'Packets sent from the destination to the source.',
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'ecs',
        title: 'ECS',
        group: 2,
        description: 'Meta-information specific to ECS.',
        type: 'group',
        fields: [
          {
            name: 'version',
            level: 'core',
            type: 'keyword',
            required: true,
            description:
              'ECS version this event conforms to. `ecs.version` is a required field and must exist in all events. When querying across multiple indices -- which may conform to slightly different ECS versions -- this field lets integrations adjust to the schema version of the events. The current version is 1.0.0-beta2 .',
            example: '1.0.0-beta2',
          },
        ],
      },
      {
        name: 'error',
        title: 'Error',
        group: 2,
        description:
          'These fields can represent errors of any kind. Use them for errors that happen while fetching events or in cases where the event itself contains an error.',
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description: 'Unique identifier for the error.',
          },
          {
            name: 'message',
            level: 'core',
            type: 'text',
            description: 'Error message.',
          },
          {
            name: 'code',
            level: 'core',
            type: 'keyword',
            description: 'Error code describing the error.',
          },
        ],
      },
      {
        name: 'event',
        title: 'Event',
        group: 2,
        description:
          'The event fields are used for context information about the log or metric event itself. A log is defined as an event containing details of something that happened. Log events must include the time at which the thing happened. Examples of log events include a process starting on a host, a network packet being sent from a source to a destination, or a network connection between a client and a server being initiated or closed. A metric is defined as an event containing one or more numerical or categorical measurements and the time at which the measurement was taken. Examples of metric events include memory pressure measured on a host, or vulnerabilities measured on a scanned host.',
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description: 'Unique ID to describe the event.',
            example: '8a4f500d',
          },
          {
            name: 'kind',
            level: 'extended',
            type: 'keyword',
            description:
              'The kind of the event. This gives information about what type of information the event contains, without being specific to the contents of the event.  Examples are `event`, `state`, `alarm`. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution.',
            example: 'state',
          },
          {
            name: 'category',
            level: 'core',
            type: 'keyword',
            description:
              'Event category. This contains high-level information about the contents of the event. It is more generic than `event.action`, in the sense that typically a category contains multiple actions. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution.',
            example: 'user-management',
          },
          {
            name: 'action',
            level: 'core',
            type: 'keyword',
            description:
              'The action captured by the event. This describes the information in the event. It is more specific than `event.category`. Examples are `group-add`, `process-started`, `file-created`. The value is normally defined by the implementer.',
            example: 'user-password-change',
          },
          {
            name: 'outcome',
            level: 'extended',
            type: 'keyword',
            description:
              'The outcome of the event. If the event describes an action, this fields contains the outcome of that action. Examples outcomes are `success` and `failure`. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution.',
            example: 'success',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description: 'Reserved for future usage. Please avoid using this field for user data.',
          },
          {
            name: 'module',
            level: 'core',
            type: 'keyword',
            description:
              'Name of the module this data is coming from. This information is coming from the modules used in Beats or Logstash.',
            example: 'mysql',
          },
          {
            name: 'dataset',
            level: 'core',
            type: 'keyword',
            description:
              'Name of the dataset. The concept of a `dataset` (fileset / metricset) is used in Beats as a subset of modules. It contains the information which is currently stored in metricset.name and metricset.module or fileset.name.',
            example: 'stats',
          },
          {
            name: 'severity',
            level: 'core',
            type: 'long',
            example: '7',
            description:
              "Severity describes the severity of the event. What the different severity values mean can very different between use cases. It's up to the implementer to make sure severities are consistent across events. ",
          },
          {
            name: 'original',
            level: 'core',
            type: 'keyword',
            example:
              'Sep 19 08:26:10 host CEF:0&#124;Security&#124; threatmanager&#124;1.0&#124;100&#124; worm successfully stopped&#124;10&#124;src=10.0.0.1 dst=2.1.2.2spt=1232',
            description:
              'Raw text message of entire event. Used to demonstrate log integrity. This field is not indexed and doc_values are disabled. It cannot be searched, but it can be retrieved from `_source`.',
            index: false,
            doc_values: false,
          },
          {
            name: 'hash',
            level: 'extended',
            type: 'keyword',
            example: '123456789012345678901234567890ABCD',
            description:
              'Hash (perhaps logstash fingerprint) of raw field to be able to demonstrate log integrity.',
          },
          {
            name: 'duration',
            level: 'core',
            type: 'long',
            format: 'duration',
            input_format: 'nanoseconds',
            description:
              'Duration of the event in nanoseconds. If event.start and event.end are known this value should be the difference between the end and start time.',
          },
          {
            name: 'timezone',
            level: 'extended',
            type: 'keyword',
            description:
              'This field should be populated when the event\'s timestamp does not include timezone information already (e.g. default Syslog timestamps). It\'s optional otherwise. Acceptable timezone formats are: a canonical ID (e.g. "Europe/Amsterdam"), abbreviated (e.g. "EST") or an HH:mm differential (e.g. "-05:00").',
          },
          {
            name: 'created',
            level: 'core',
            type: 'date',
            description:
              'event.created contains the date when the event was created. This timestamp is distinct from @timestamp in that @timestamp contains the processed timestamp. For logs these two timestamps can be different as the timestamp in the log line and when the event is read for example by Filebeat are not identical. `@timestamp` must contain the timestamp extracted from the log line, event.created when the log line is read. The same could apply to package capturing where @timestamp contains the timestamp extracted from the network package and event.created when the event was created. In case the two timestamps are identical, @timestamp should be used.',
          },
          {
            name: 'start',
            level: 'extended',
            type: 'date',
            description:
              'event.start contains the date when the event started or when the activity was first observed.',
          },
          {
            name: 'end',
            level: 'extended',
            type: 'date',
            description:
              'event.end contains the date when the event ended or when the activity was last observed.',
          },
          {
            name: 'risk_score',
            level: 'core',
            type: 'float',
            description:
              "Risk score or priority of the event (e.g. security solutions). Use your system's original value here. ",
          },
          {
            name: 'risk_score_norm',
            level: 'extended',
            type: 'float',
            description:
              'Normalized risk score or priority of the event, on a scale of 0 to 100. This is mainly useful if you use more than one system that assigns risk scores, and you want to see a normalized value across all systems.',
          },
        ],
      },
      {
        name: 'file',
        group: 2,
        title: 'File',
        description:
          'A file is defined as a set of information that has been created on, or has existed on a filesystem. File objects can be associated with host events, network events, and/or file events (e.g., those produced by File Integrity Monitoring [FIM] products or services). File fields provide details about the affected file associated with the event or metric.',
        type: 'group',
        fields: [
          {
            name: 'path',
            level: 'extended',
            type: 'keyword',
            description: 'Path to the file.',
          },
          {
            name: 'target_path',
            level: 'extended',
            type: 'keyword',
            description: 'Target path for symlinks.',
          },
          {
            name: 'extension',
            level: 'extended',
            type: 'keyword',
            description: 'File extension. This should allow easy filtering by file extensions.',
            example: 'png',
          },
          {
            name: 'type',
            level: 'extended',
            type: 'keyword',
            description: 'File type (file, dir, or symlink).',
          },
          {
            name: 'device',
            level: 'extended',
            type: 'keyword',
            description: 'Device that is the source of the file.',
          },
          {
            name: 'inode',
            level: 'extended',
            type: 'keyword',
            description: 'Inode representing the file in the filesystem.',
          },
          {
            name: 'uid',
            level: 'extended',
            type: 'keyword',
            description: 'The user ID (UID) or security identifier (SID) of the file owner.',
          },
          {
            name: 'owner',
            level: 'extended',
            type: 'keyword',
            description: "File owner's username.",
          },
          {
            name: 'gid',
            level: 'extended',
            type: 'keyword',
            description: 'Primary group ID (GID) of the file.',
          },
          {
            name: 'group',
            level: 'extended',
            type: 'keyword',
            description: 'Primary group name of the file.',
          },
          {
            name: 'mode',
            level: 'extended',
            type: 'keyword',
            example: 416,
            description: 'Mode of the file in octal representation.',
          },
          {
            name: 'size',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'File size in bytes (field is only added when `type` is `file`).',
          },
          {
            name: 'mtime',
            level: 'extended',
            type: 'date',
            description: 'Last time file content was modified.',
          },
          {
            name: 'ctime',
            level: 'extended',
            type: 'date',
            description: 'Last time file metadata changed.',
          },
        ],
      },
      {
        name: 'group',
        title: 'Group',
        group: 2,
        description:
          'The group fields are meant to represent groups that are relevant to the event.',
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'extended',
            type: 'keyword',
            description: 'Unique identifier for the group on the system/platform.',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Name of the group.',
          },
        ],
      },
      {
        name: 'host',
        title: 'Host',
        group: 2,
        description:
          'A host is defined as a general computing instance. ECS host.* fields should be populated with details about the host on which the event happened, or on which the measurement was taken. Host types include hardware, virtual machines, Docker containers, and Kubernetes nodes.',
        type: 'group',
        fields: [
          {
            name: 'hostname',
            level: 'core',
            type: 'keyword',
            description:
              'Hostname of the host. It normally contains what the `hostname` command returns on the host machine.',
          },
          {
            name: 'name',
            level: 'core',
            type: 'keyword',
            description:
              'Name of the host. It can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
          },
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description:
              'Unique host id. As hostname is not always unique, use values that are meaningful in your environment. Example: The current usage of `beat.name`.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'Host ip address.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'Host mac address.',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description:
              'Type of host. For Cloud providers this can be the machine type like `t2.medium`. If vm, this could be the container, for example, or other information meaningful in your environment.',
          },
          {
            name: 'architecture',
            level: 'core',
            type: 'keyword',
            example: 'x86_64',
            description: 'Operating system architecture.',
          },
          {
            name: 'os',
            title: 'Operating System',
            group: 2,
            description: 'The OS fields contain information about the operating system.',
            reusable: {
              top_level: false,
              expected: ['observer', 'host', 'user_agent'],
            },
            type: 'group',
            fields: [
              {
                name: 'platform',
                level: 'extended',
                type: 'keyword',
                description: 'Operating system platform (such centos, ubuntu, windows).',
                example: 'darwin',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS X',
                description: 'Operating system name, without the version.',
              },
              {
                name: 'full',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS Mojave',
                description: 'Operating system name, including the version or code name.',
              },
              {
                name: 'family',
                level: 'extended',
                type: 'keyword',
                example: 'debian',
                description: 'OS family (such as redhat, debian, freebsd, windows).',
              },
              {
                name: 'version',
                level: 'extended',
                type: 'keyword',
                example: '10.14.1',
                description: 'Operating system version as a raw string.',
              },
              {
                name: 'kernel',
                level: 'extended',
                type: 'keyword',
                example: '4.4.0-112-generic',
                description: 'Operating system kernel version as a raw string.',
              },
            ],
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'http',
        title: 'HTTP',
        group: 2,
        description: 'Fields related to HTTP activity.',
        type: 'group',
        fields: [
          {
            name: 'request.method',
            level: 'extended',
            type: 'keyword',
            description:
              'Http request method. The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS"  section.',
            example: 'get, post, put',
          },
          {
            name: 'request.body.content',
            level: 'extended',
            type: 'keyword',
            description: 'The full http request body.',
            example: 'Hello world',
          },
          {
            name: 'request.referrer',
            level: 'extended',
            type: 'keyword',
            description: 'Referrer for this HTTP request.',
            example: 'https://blog.example.com/',
          },
          {
            name: 'response.status_code',
            level: 'extended',
            type: 'long',
            description: 'Http response status code.',
            example: 404,
          },
          {
            name: 'response.body.content',
            level: 'extended',
            type: 'keyword',
            description: 'The full http response body.',
            example: 'Hello world',
          },
          {
            name: 'version',
            level: 'extended',
            type: 'keyword',
            description: 'Http version.',
            example: 1.1,
          },
          {
            name: 'request.bytes',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'Total size in bytes of the request (body and headers).',
            example: 1437,
          },
          {
            name: 'request.body.bytes',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'Size in bytes of the request body.',
            example: 887,
          },
          {
            name: 'response.bytes',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'Total size in bytes of the response (body and headers).',
            example: 1437,
          },
          {
            name: 'response.body.bytes',
            level: 'extended',
            type: 'long',
            format: 'bytes',
            description: 'Size in bytes of the response body.',
            example: 887,
          },
        ],
      },
      {
        name: 'log',
        title: 'Log',
        description: 'Fields which are specific to log events.',
        type: 'group',
        fields: [
          {
            name: 'level',
            level: 'core',
            type: 'keyword',
            description: 'Log level of the log event. Some examples are `WARN`, `ERR`, `INFO`.',
            example: 'ERR',
          },
          {
            name: 'original',
            level: 'core',
            type: 'keyword',
            example: 'Sep 19 08:26:10 localhost My log',
            index: false,
            doc_values: false,
            description:
              " This is the original log message and contains the full log message before splitting it up in multiple parts. In contrast to the `message` field which can contain an extracted part of the log message, this field contains the original, full log message. It can have already some modifications applied like encoding or new lines removed to clean up the log message. This field is not indexed and doc_values are disabled so it can't be queried but the value can be retrieved from `_source`. ",
          },
        ],
      },
      {
        name: 'network',
        title: 'Network',
        group: 2,
        description:
          'The network is defined as the communication path over which a host or network event happens. The network.* fields should be populated with details about the network activity associated with an event.',
        type: 'group',
        fields: [
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Name given by operators to sections of their network.',
            example: 'Guest Wifi',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description:
              'In the OSI Model this would be the Network Layer. ipv4, ipv6, ipsec, pim, etc The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS" section.',
            example: 'ipv4',
          },
          {
            name: 'iana_number',
            level: 'extended',
            type: 'keyword',
            description:
              'IANA Protocol Number (https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml). Standardized list of protocols. This aligns well with NetFlow and sFlow related logs which use the IANA Protocol Number.',
            example: 6,
          },
          {
            name: 'transport',
            level: 'core',
            type: 'keyword',
            description:
              'Same as network.iana_number, but instead using the Keyword name of the transport layer (udp, tcp, ipv6-icmp, etc.) The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS"  section.',
            example: 'tcp',
          },
          {
            name: 'application',
            level: 'extended',
            type: 'keyword',
            description:
              'A name given to an application. This can be arbitrarily assigned for things like microservices, but also apply to things like skype, icq, facebook, twitter. This would be used in situations where the vendor or service can be decoded such as from the source/dest IP owners, ports, or wire format. The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS" section.',
            example: 'aim',
          },
          {
            name: 'protocol',
            level: 'core',
            type: 'keyword',
            description:
              'L7 Network protocol name. ex. http, lumberjack, transport protocol. The field value must be normalized to lowercase for querying. See "Lowercase Capitalization" in the "Implementing ECS" section.',
            example: 'http',
          },
          {
            name: 'direction',
            level: 'core',
            type: 'keyword',
            description:
              "Direction of the network traffic. Recommended values are:  * inbound   * outbound   * internal   * external   * unknown  When mapping events from a host-based monitoring context, populate this field from the host's point of view. When mapping events from a network or perimeter-based monitoring context, populate this field from the point of view of your network perimeter. ",
            example: 'inbound',
          },
          {
            name: 'forwarded_ip',
            level: 'core',
            type: 'ip',
            description: 'Host IP address when the source IP address is the proxy.',
            example: '192.1.1.2',
          },
          {
            name: 'community_id',
            level: 'extended',
            type: 'keyword',
            description:
              'A hash of source and destination IPs and ports, as well as the protocol used in a communication. This is a tool-agnostic standard to identify flows. Learn more at https://github.com/corelight/community-id-spec.',
            example: '1:hO+sN4H+MG5MY/8hIrXPqc4ZQz0=',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            description:
              'Total bytes transferred in both directions. If `source.bytes` and `destination.bytes` are known, `network.bytes` is their sum.',
            example: 368,
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            description:
              'Total packets transferred in both directions. If `source.packets` and `destination.packets` are known, `network.packets` is their sum.',
            example: 24,
          },
        ],
      },
      {
        name: 'observer',
        title: 'Observer',
        group: 2,
        description:
          'An observer is defined as a special network, security, or application device used to detect, observe, or create network, security, or application-related events and metrics. This could be a custom hardware appliance or a server that has been configured to run special network, security, or application software. Examples include firewalls, intrusion detection/prevention systems, network monitoring sensors, web application firewalls, data loss prevention systems, and APM servers. The observer.* fields shall be populated with details of the system, if any, that detects, observes and/or creates a network, security, or application event or metric. Message queues and ETL components used in processing events or metrics are not considered observers in ECS.',
        type: 'group',
        fields: [
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the observer',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'IP address of the observer.',
          },
          {
            name: 'hostname',
            level: 'core',
            type: 'keyword',
            description: 'Hostname of the observer.',
          },
          {
            name: 'vendor',
            level: 'core',
            type: 'keyword',
            description: 'observer vendor information.',
          },
          {
            name: 'version',
            level: 'core',
            type: 'keyword',
            description: 'Observer version.',
          },
          {
            name: 'serial_number',
            level: 'extended',
            type: 'keyword',
            description: 'Observer serial number.',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            description:
              'The type of the observer the data is coming from. There is no predefined list of observer types. Some examples are `forwarder`, `firewall`, `ids`, `ips`, `proxy`, `poller`, `sensor`, `APM server`.',
            example: 'firewall',
          },
          {
            name: 'os',
            title: 'Operating System',
            group: 2,
            description: 'The OS fields contain information about the operating system.',
            reusable: {
              top_level: false,
              expected: ['observer', 'host', 'user_agent'],
            },
            type: 'group',
            fields: [
              {
                name: 'platform',
                level: 'extended',
                type: 'keyword',
                description: 'Operating system platform (such centos, ubuntu, windows).',
                example: 'darwin',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS X',
                description: 'Operating system name, without the version.',
              },
              {
                name: 'full',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS Mojave',
                description: 'Operating system name, including the version or code name.',
              },
              {
                name: 'family',
                level: 'extended',
                type: 'keyword',
                example: 'debian',
                description: 'OS family (such as redhat, debian, freebsd, windows).',
              },
              {
                name: 'version',
                level: 'extended',
                type: 'keyword',
                example: '10.14.1',
                description: 'Operating system version as a raw string.',
              },
              {
                name: 'kernel',
                level: 'extended',
                type: 'keyword',
                example: '4.4.0-112-generic',
                description: 'Operating system kernel version as a raw string.',
              },
            ],
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'organization',
        title: 'Organization',
        group: 2,
        description:
          'The organization fields enrich data with information about the company or entity the data is associated with. These fields help you arrange or filter data stored in an index by one or multiple organizations.',
        type: 'group',
        fields: [
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Organization name.',
          },
          {
            name: 'id',
            level: 'extended',
            type: 'keyword',
            description: 'Unique identifier for the organization.',
          },
        ],
      },
      {
        name: 'os',
        title: 'Operating System',
        group: 2,
        description: 'The OS fields contain information about the operating system.',
        reusable: {
          top_level: false,
          expected: ['observer', 'host', 'user_agent'],
        },
        type: 'group',
        fields: [
          {
            name: 'platform',
            level: 'extended',
            type: 'keyword',
            description: 'Operating system platform (such centos, ubuntu, windows).',
            example: 'darwin',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            example: 'Mac OS X',
            description: 'Operating system name, without the version.',
          },
          {
            name: 'full',
            level: 'extended',
            type: 'keyword',
            example: 'Mac OS Mojave',
            description: 'Operating system name, including the version or code name.',
          },
          {
            name: 'family',
            level: 'extended',
            type: 'keyword',
            example: 'debian',
            description: 'OS family (such as redhat, debian, freebsd, windows).',
          },
          {
            name: 'version',
            level: 'extended',
            type: 'keyword',
            example: '10.14.1',
            description: 'Operating system version as a raw string.',
          },
          {
            name: 'kernel',
            level: 'extended',
            type: 'keyword',
            example: '4.4.0-112-generic',
            description: 'Operating system kernel version as a raw string.',
          },
        ],
      },
      {
        name: 'process',
        title: 'Process',
        group: 2,
        description:
          'These fields contain information about a process. These fields can help you correlate metrics information with a process id/name from a log message.  The `process.pid` often stays in the metric itself and is copied to the global field for correlation.',
        type: 'group',
        fields: [
          {
            name: 'pid',
            level: 'core',
            type: 'long',
            description: 'Process id.',
            example: 'ssh',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            description: 'Process name. Sometimes called program name or similar.',
            example: 'ssh',
          },
          {
            name: 'ppid',
            level: 'extended',
            type: 'long',
            description: 'Process parent id.',
          },
          {
            name: 'args',
            level: 'extended',
            type: 'keyword',
            description: 'Process arguments. May be filtered to protect sensitive information.',
            example: ['ssh', '-l', 'user', '10.0.0.16'],
          },
          {
            name: 'executable',
            level: 'extended',
            type: 'keyword',
            description: 'Absolute path to the process executable.',
            example: '/usr/bin/ssh',
          },
          {
            name: 'title',
            level: 'extended',
            type: 'keyword',
            description:
              'Process title. The proctitle, some times the same as process name. Can also be different: for example a browser setting its title to the web page currently opened.',
          },
          {
            name: 'thread.id',
            level: 'extended',
            type: 'long',
            example: 4242,
            description: 'Thread ID.',
          },
          {
            name: 'start',
            level: 'extended',
            type: 'date',
            example: '2016-05-23T08:05:34.853Z',
            description: 'The time the process started.',
          },
          {
            name: 'working_directory',
            level: 'extended',
            type: 'keyword',
            example: '/home/alice',
            description: 'The working directory of the process.',
          },
        ],
      },
      {
        name: 'related',
        title: 'Related',
        group: 2,
        description:
          'This field set is meant to facilitate pivoting around a piece of data. Some pieces of information can be seen in many places in ECS. To facilitate searching for them, append values to their corresponding field in `related.`. A concrete example is IP addresses, which can be under host, observer, source, destination, client, server, and network.forwarded_ip. If you append all IPs to `related.ip`, you can then search for a given IP trivially, no matter where it appeared, by querying `related.ip:a.b.c.d`.',
        type: 'group',
        fields: [
          {
            name: 'ip',
            level: 'extended',
            type: 'ip',
            description: 'All of the IPs seen on your event.',
          },
        ],
      },
      {
        name: 'server',
        title: 'Server',
        group: 2,
        description:
          'A Server is defined as the responder in a network connection for events regarding sessions, connections, or bidirectional flow records. For TCP events, the server is the receiver of the initial SYN packet(s) of the TCP connection. For other protocols, the server is generally the responder in the network transaction. Some systems actually use the term "responder" to refer the server in TCP connections. The server fields describe details about the system acting as the server in the network event. Server fields are usually populated in conjunction with client fields. Server fields are generally not populated for packet-level events. Client / server representations can add semantic context to an exchange, which is helpful to visualize the data in certain situations. If your context falls in that category, you should still ensure that source and destination are filled appropriately.',
        type: 'group',
        fields: [
          {
            name: 'address',
            level: 'extended',
            type: 'keyword',
            description:
              'Some event server addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'IP address of the server. Can be one or multiple IPv4 or IPv6 addresses.',
          },
          {
            name: 'port',
            level: 'core',
            type: 'long',
            description: 'Port of the server.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the server.',
          },
          {
            name: 'domain',
            level: 'core',
            type: 'keyword',
            description: 'Server domain.',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            example: 184,
            description: 'Bytes sent from the server to the client.',
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            example: 12,
            description: 'Packets sent from the server to the client.',
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'service',
        title: 'Service',
        group: 2,
        description:
          'The service fields describe the service for or from which the data was collected. These fields help you find and correlate logs for a specific service and version.',
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description:
              'Unique identifier of the running service. This id should uniquely identify this service. This makes it possible to correlate logs and metrics for one specific service. Example: If you are experiencing issues with one redis instance, you can filter on that id to see metrics and logs for that single instance.',
            example: 'd37e5ebfe0ae6c4972dbe9f0174a1637bb8247f6',
          },
          {
            name: 'name',
            level: 'core',
            type: 'keyword',
            example: 'elasticsearch-metrics',
            description:
              'Name of the service data is collected from. The name of the service is normally user given. This allows if two instances of the same service are running on the same machine they can be differentiated by the `service.name`. Also it allows for distributed services that run on multiple hosts to correlate the related instances based on the name. In the case of Elasticsearch the service.name could contain the cluster name. For Beats the service.name is by default a copy of the `service.type` field if no name is specified.',
          },
          {
            name: 'type',
            level: 'core',
            type: 'keyword',
            example: 'elasticsearch',
            description:
              'The type of the service data is collected from. The type can be used to group and correlate logs and metrics from one service type. Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.',
          },
          {
            name: 'state',
            level: 'core',
            type: 'keyword',
            description: 'Current state of the service.',
          },
          {
            name: 'version',
            level: 'core',
            type: 'keyword',
            example: '3.2.4',
            description:
              'Version of the service the data was collected from. This allows to look at a data set only for a specific version of a service.',
          },
          {
            name: 'ephemeral_id',
            level: 'extended',
            type: 'keyword',
            description:
              'Ephemeral identifier of this service (if one exists). This id normally changes across restarts, but `service.id` does not.',
            example: '8a4f500f',
          },
        ],
      },
      {
        name: 'source',
        title: 'Source',
        group: 2,
        description:
          'Source fields describe details about the source of a packet/event. Source fields are usually populated in conjunction with destination fields.',
        type: 'group',
        fields: [
          {
            name: 'address',
            level: 'extended',
            type: 'keyword',
            description:
              'Some event source addresses are defined ambiguously. The event will sometimes list an IP, a domain or a unix socket.  You should always store the raw address in the `.address` field. Then it should be duplicated to `.ip` or `.domain`, depending on which one it is.',
          },
          {
            name: 'ip',
            level: 'core',
            type: 'ip',
            description: 'IP address of the source. Can be one or multiple IPv4 or IPv6 addresses.',
          },
          {
            name: 'port',
            level: 'core',
            type: 'long',
            description: 'Port of the source.',
          },
          {
            name: 'mac',
            level: 'core',
            type: 'keyword',
            description: 'MAC address of the source.',
          },
          {
            name: 'domain',
            level: 'core',
            type: 'keyword',
            description: 'Source domain.',
          },
          {
            name: 'bytes',
            level: 'core',
            type: 'long',
            format: 'bytes',
            example: 184,
            description: 'Bytes sent from the source to the destination.',
          },
          {
            name: 'packets',
            level: 'core',
            type: 'long',
            example: 12,
            description: 'Packets sent from the source to the destination.',
          },
          {
            name: 'geo',
            title: 'Geo',
            group: 2,
            description:
              'Geo fields can carry data about a specific location related to an event or geo information derived from an IP field.',
            type: 'group',
            fields: [
              {
                name: 'location',
                level: 'core',
                type: 'geo_point',
                description: 'Longitude and latitude.',
                example: '{ "lon": -73.614830, "lat": 45.505918 }',
              },
              {
                name: 'continent_name',
                level: 'core',
                type: 'keyword',
                description: 'Name of the continent.',
                example: 'North America',
              },
              {
                name: 'country_name',
                level: 'core',
                type: 'keyword',
                description: 'Country name.',
                example: 'Canada',
              },
              {
                name: 'region_name',
                level: 'core',
                type: 'keyword',
                description: 'Region name.',
                example: 'Quebec',
              },
              {
                name: 'city_name',
                level: 'core',
                type: 'keyword',
                description: 'City name.',
                example: 'Montreal',
              },
              {
                name: 'country_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Country ISO code.',
                example: 'CA',
              },
              {
                name: 'region_iso_code',
                level: 'core',
                type: 'keyword',
                description: 'Region ISO code.',
                example: 'CA-QC',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description:
                  'User-defined description of a location, at the level of granularity they care about. Could be the name of their data centers, the floor number, if this describes a local physical entity, city names. Not typically used in automated geolocation.',
                example: 'boston-dc',
              },
            ],
          },
        ],
      },
      {
        name: 'url',
        title: 'URL',
        description: 'URL fields provide a complete URL, with scheme, host, and path.',
        type: 'group',
        fields: [
          {
            name: 'original',
            level: 'extended',
            type: 'keyword',
            description:
              'Unmodified original url as seen in the event source. Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path. This field is meant to represent the URL as it was observed, complete or not.',
            example:
              'https://www.elastic.co:443/search?q=elasticsearch#top or /search?q=elasticsearch',
          },
          {
            name: 'full',
            level: 'extended',
            type: 'keyword',
            description:
              'If full URLs are important to your use case, they should be stored in `url.full`, whether this field is reconstructed or present in the event source.',
            example: 'https://www.elastic.co:443/search?q=elasticsearch#top',
          },
          {
            name: 'scheme',
            level: 'extended',
            type: 'keyword',
            description:
              'Scheme of the request, such as "https". Note: The `:` is not part of the scheme.',
            example: 'https',
          },
          {
            name: 'domain',
            level: 'extended',
            type: 'keyword',
            description:
              'Domain of the request, such as "www.elastic.co". In some cases a URL may refer to an IP and/or port directly, without a domain name. In this case, the IP address would go to the `domain` field.',
            example: 'www.elastic.co',
          },
          {
            name: 'port',
            level: 'extended',
            type: 'integer',
            description: 'Port of the request, such as 443.',
            example: 443,
          },
          {
            name: 'path',
            level: 'extended',
            type: 'keyword',
            description: 'Path of the request, such as "/search".',
          },
          {
            name: 'query',
            level: 'extended',
            type: 'keyword',
            description:
              'The query field describes the query string of the request, such as "q=elasticsearch". The `?` is excluded from the query string. If a URL contains no `?`, there is no query field. If there is a `?` but no query, the query field exists with an empty string. The `exists` query can be used to differentiate between the two cases.',
          },
          {
            name: 'fragment',
            level: 'extended',
            type: 'keyword',
            description:
              'Portion of the url after the `#`, such as "top". The `#` is not part of the fragment.',
          },
          {
            name: 'username',
            level: 'extended',
            type: 'keyword',
            description: 'Username of the request.',
          },
          {
            name: 'password',
            level: 'extended',
            type: 'keyword',
            description: 'Password of the request.',
          },
        ],
      },
      {
        name: 'user',
        title: 'User',
        group: 2,
        description:
          'The user fields describe information about the user that is relevant to  the event. Fields can have one entry or multiple entries. If a user has more than one id, provide an array that includes all of them.',
        reusable: {
          top_level: true,
          expected: ['client', 'destination', 'host', 'server', 'source'],
        },
        type: 'group',
        fields: [
          {
            name: 'id',
            level: 'core',
            type: 'keyword',
            description: 'One or multiple unique identifiers of the user.',
          },
          {
            name: 'name',
            level: 'core',
            type: 'keyword',
            example: 'albert',
            description: 'Short name or login of the user.',
          },
          {
            name: 'full_name',
            level: 'extended',
            type: 'keyword',
            example: 'Albert Einstein',
            description: "User's full name, if available. ",
          },
          {
            name: 'email',
            level: 'extended',
            type: 'keyword',
            description: 'User email address.',
          },
          {
            name: 'hash',
            level: 'extended',
            type: 'keyword',
            description:
              'Unique user hash to correlate information for a user in anonymized form. Useful if `user.id` or `user.name` contain confidential information and cannot be used.',
          },
          {
            name: 'group',
            title: 'Group',
            group: 2,
            description:
              'The group fields are meant to represent groups that are relevant to the event.',
            type: 'group',
            fields: [
              {
                name: 'id',
                level: 'extended',
                type: 'keyword',
                description: 'Unique identifier for the group on the system/platform.',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                description: 'Name of the group.',
              },
            ],
          },
        ],
      },
      {
        name: 'user_agent',
        title: 'User agent',
        group: 2,
        description:
          'The user_agent fields normally come from a browser request. They often show up in web service logs coming from the parsed user agent string.',
        type: 'group',
        fields: [
          {
            name: 'original',
            level: 'extended',
            type: 'keyword',
            description: 'Unparsed version of the user_agent.',
            example:
              'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
          },
          {
            name: 'name',
            level: 'extended',
            type: 'keyword',
            example: 'Safari',
            description: 'Name of the user agent.',
          },
          {
            name: 'version',
            level: 'extended',
            type: 'keyword',
            description: 'Version of the user agent.',
            example: 12,
          },
          {
            name: 'device.name',
            level: 'extended',
            type: 'keyword',
            example: 'iPhone',
            description: 'Name of the device.',
          },
          {
            name: 'os',
            title: 'Operating System',
            group: 2,
            description: 'The OS fields contain information about the operating system.',
            reusable: {
              top_level: false,
              expected: ['observer', 'host', 'user_agent'],
            },
            type: 'group',
            fields: [
              {
                name: 'platform',
                level: 'extended',
                type: 'keyword',
                description: 'Operating system platform (such centos, ubuntu, windows).',
                example: 'darwin',
              },
              {
                name: 'name',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS X',
                description: 'Operating system name, without the version.',
              },
              {
                name: 'full',
                level: 'extended',
                type: 'keyword',
                example: 'Mac OS Mojave',
                description: 'Operating system name, including the version or code name.',
              },
              {
                name: 'family',
                level: 'extended',
                type: 'keyword',
                example: 'debian',
                description: 'OS family (such as redhat, debian, freebsd, windows).',
              },
              {
                name: 'version',
                level: 'extended',
                type: 'keyword',
                example: '10.14.1',
                description: 'Operating system version as a raw string.',
              },
              {
                name: 'kernel',
                level: 'extended',
                type: 'keyword',
                example: '4.4.0-112-generic',
                description: 'Operating system kernel version as a raw string.',
              },
            ],
          },
        ],
      },
      {
        name: 'agent.hostname',
        type: 'keyword',
        description: 'Hostname of the agent.',
      },
    ],
  },
  {
    key: 'beat',
    title: 'Beat',
    description: 'Contains common beat fields available in all event types.',
    fields: [
      {
        name: 'beat.timezone',
        type: 'alias',
        path: 'event.timezone',
        migration: true,
      },
      {
        name: 'fields',
        type: 'object',
        object_type: 'keyword',
        description: 'Contains user configurable fields.',
      },
      {
        name: 'error',
        type: 'group',
        description: 'Error fields containing additional info in case of errors.',
        fields: [
          {
            name: 'type',
            type: 'keyword',
            description: 'Error type.',
          },
        ],
      },
      {
        name: 'beat.name',
        type: 'alias',
        path: 'host.name',
        migration: true,
      },
      {
        name: 'beat.hostname',
        type: 'alias',
        path: 'agent.hostname',
        migration: true,
      },
    ],
  },
  {
    key: 'cloud',
    title: 'Cloud provider metadata',
    description: 'Metadata from cloud providers added by the add_cloud_metadata processor.',
    fields: [
      {
        name: 'cloud.project.id',
        example: 'project-x',
        description: 'Name of the project in Google Cloud.',
      },
      {
        name: 'meta.cloud.provider',
        type: 'alias',
        path: 'cloud.provider',
        migration: true,
      },
      {
        name: 'meta.cloud.instance_id',
        type: 'alias',
        path: 'cloud.instance.id',
        migration: true,
      },
      {
        name: 'meta.cloud.instance_name',
        type: 'alias',
        path: 'cloud.instance.name',
        migration: true,
      },
      {
        name: 'meta.cloud.machine_type',
        type: 'alias',
        path: 'cloud.machine.type',
        migration: true,
      },
      {
        name: 'meta.cloud.availability_zone',
        type: 'alias',
        path: 'cloud.availability_zone',
        migration: true,
      },
      {
        name: 'meta.cloud.project_id',
        type: 'alias',
        path: 'cloud.project.id',
        migration: true,
      },
      {
        name: 'meta.cloud.region',
        type: 'alias',
        path: 'cloud.region',
        migration: true,
      },
    ],
  },
  {
    key: 'docker',
    title: 'Docker',
    description: 'Docker stats collected from Docker.',
    short_config: false,
    anchor: 'docker-processor',
    fields: [
      {
        name: 'docker',
        type: 'group',
        fields: [
          {
            name: 'container.id',
            type: 'alias',
            path: 'container.id',
            migration: true,
          },
          {
            name: 'container.image',
            type: 'alias',
            path: 'container.image.name',
            migration: true,
          },
          {
            name: 'container.name',
            type: 'alias',
            path: 'container.name',
            migration: true,
          },
          {
            name: 'container.labels',
            type: 'object',
            object_type: 'keyword',
            description: 'Image labels.',
          },
        ],
      },
    ],
  },
  {
    key: 'host',
    title: 'Host',
    description: 'Info collected for the host machine.',
    anchor: 'host-processor',
  },
  {
    key: 'kubernetes',
    title: 'Kubernetes',
    description: 'Kubernetes metadata added by the kubernetes processor',
    short_config: false,
    anchor: 'kubernetes-processor',
    fields: [
      {
        name: 'kubernetes',
        type: 'group',
        fields: [
          {
            name: 'pod.name',
            type: 'keyword',
            description: 'Kubernetes pod name',
          },
          {
            name: 'pod.uid',
            type: 'keyword',
            description: 'Kubernetes Pod UID',
          },
          {
            name: 'namespace',
            type: 'keyword',
            description: 'Kubernetes namespace',
          },
          {
            name: 'node.name',
            type: 'keyword',
            description: 'Kubernetes node name',
          },
          {
            name: 'labels',
            type: 'object',
            description: 'Kubernetes labels map',
          },
          {
            name: 'annotations',
            type: 'object',
            description: 'Kubernetes annotations map',
          },
          {
            name: 'container.name',
            type: 'keyword',
            description: 'Kubernetes container name',
          },
          {
            name: 'container.image',
            type: 'keyword',
            description: 'Kubernetes container image',
          },
        ],
      },
    ],
  },
  {
    key: 'process',
    title: 'Process',
    description: 'Process metadata fields',
    fields: [
      {
        name: 'process',
        type: 'group',
        fields: [
          {
            name: 'exe',
            type: 'alias',
            path: 'process.executable',
            migration: true,
          },
        ],
      },
    ],
  },
  {
    key: 'common',
    title: 'Common',
    description:
      'These fields contain data about the environment in which the transaction or flow was captured.',
    fields: [
      {
        name: 'type',
        description:
          'The type of the transaction (for example, HTTP, MySQL, Redis, or RUM) or "flow" in case of flows.',
        required: true,
      },
      {
        name: 'server.process.name',
        description: 'The name of the process that served the transaction.',
      },
      {
        name: 'server.process.args',
        description: 'The command-line of the process that served the transaction.',
      },
      {
        name: 'server.process.executable',
        description: 'Absolute path to the server process executable.',
      },
      {
        name: 'server.process.working_directory',
        description: 'The working directory of the server process.',
      },
      {
        name: 'server.process.start',
        description: 'The time the server process started.',
      },
      {
        name: 'client.process.name',
        description: 'The name of the process that initiated the transaction.',
      },
      {
        name: 'client.process.args',
        description: 'The command-line of the process that initiated the transaction.',
      },
      {
        name: 'client.process.executable',
        description: 'Absolute path to the client process executable.',
      },
      {
        name: 'client.process.working_directory',
        description: 'The working directory of the client process.',
      },
      {
        name: 'client.process.start',
        description: 'The time the client process started.',
      },
      {
        name: 'real_ip',
        type: 'alias',
        path: 'network.forwarded_ip',
        migration: true,
        description:
          'If the server initiating the transaction is a proxy, this field contains the original client IP address. For HTTP, for example, the IP address extracted from a configurable HTTP header, by default `X-Forwarded-For`. Unless this field is disabled, it always has a value, and it matches the `client_ip` for non proxy clients.',
      },
      {
        name: 'transport',
        type: 'alias',
        path: 'network.transport',
        migration: true,
        description:
          'The transport protocol used for the transaction. If not specified, then tcp is assumed.',
      },
    ],
  },
  {
    key: 'flows_event',
    title: 'Flow Event',
    description: 'These fields contain data about the flow itself.',
    fields: [
      {
        name: 'flow.final',
        type: 'boolean',
        description:
          'Indicates if event is last event in flow. If final is false, the event reports an intermediate flow state only.',
      },
      {
        name: 'flow.id',
        description: 'Internal flow ID based on connection meta data and address.',
      },
      {
        name: 'flow.vlan',
        type: 'long',
        description:
          "VLAN identifier from the 802.1q frame. In case of a multi-tagged frame this field will be an array with the outer tag's VLAN identifier listed first. ",
      },
      {
        name: 'flow_id',
        type: 'alias',
        path: 'flow.id',
        migration: true,
      },
      {
        name: 'final',
        type: 'alias',
        path: 'flow.final',
        migration: true,
      },
      {
        name: 'vlan',
        type: 'alias',
        path: 'flow.vlan',
        migration: true,
      },
      {
        name: 'source.stats.net_bytes_total',
        type: 'alias',
        path: 'source.bytes',
        migration: true,
      },
      {
        name: 'source.stats.net_packets_total',
        type: 'alias',
        path: 'source.packets',
        migration: true,
      },
      {
        name: 'dest.stats.net_bytes_total',
        type: 'alias',
        path: 'destination.bytes',
        migration: true,
      },
      {
        name: 'dest.stats.net_packets_total',
        type: 'alias',
        path: 'destination.packets',
        migration: true,
      },
    ],
  },
  {
    key: 'trans_event',
    title: 'Transaction Event',
    description: 'These fields contain data about the transaction itself.',
    fields: [
      {
        name: 'status',
        description:
          'The high level status of the transaction. The way to compute this value depends on the protocol, but the result has a meaning independent of the protocol.',
        required: true,
        possible_values: ['OK', 'Error', 'Server Error', 'Client Error'],
      },
      {
        name: 'method',
        description:
          'The command/verb/method of the transaction. For HTTP, this is the method name (GET, POST, PUT, and so on), for SQL this is the verb (SELECT, UPDATE, DELETE, and so on).',
      },
      {
        name: 'resource',
        description:
          'The logical resource that this transaction refers to. For HTTP, this is the URL path up to the last slash (/). For example, if the URL is `/users/1`, the resource is `/users`. For databases, the resource is typically the table name. The field is not filled for all transaction types.',
      },
      {
        name: 'path',
        required: true,
        description:
          'The path the transaction refers to. For HTTP, this is the URL. For SQL databases, this is the table name. For key-value stores, this is the key.',
      },
      {
        name: 'query',
        type: 'keyword',
        description:
          'The query in a human readable format. For HTTP, it will typically be something like `GET /users/_search?name=test`. For MySQL, it is something like `SELECT id from users where name=test`.',
      },
      {
        name: 'params',
        type: 'text',
        description:
          'The request parameters. For HTTP, these are the POST or GET parameters. For Thrift-RPC, these are the parameters from the request.',
      },
      {
        name: 'notes',
        type: 'alias',
        path: 'error.message',
        description:
          'Messages from Packetbeat itself. This field usually contains error messages for interpreting the raw data. This information can be helpful for troubleshooting.',
      },
    ],
  },
  {
    key: 'raw',
    title: 'Raw',
    description: 'These fields contain the raw transaction data.',
    fields: [
      {
        name: 'request',
        type: 'text',
        description:
          'For text protocols, this is the request as seen on the wire (application layer only). For binary protocols this is our representation of the request.',
      },
      {
        name: 'response',
        type: 'text',
        description:
          'For text protocols, this is the response as seen on the wire (application layer only). For binary protocols this is our representation of the request.',
      },
    ],
  },
  {
    key: 'trans_measurements',
    title: 'Measurements (Transactions)',
    description: 'These fields contain measurements related to the transaction.',
    fields: [
      {
        name: 'bytes_in',
        type: 'alias',
        path: 'source.bytes',
        description:
          'The number of bytes of the request. Note that this size is the application layer message length, without the length of the IP or TCP headers.',
      },
      {
        name: 'bytes_out',
        type: 'alias',
        path: 'destination.bytes',
        description:
          'The number of bytes of the response. Note that this size is the application layer message length, without the length of the IP or TCP headers.',
      },
    ],
  },
  {
    key: 'amqp',
    title: 'AMQP',
    description: 'AMQP specific event fields.',
    fields: [
      {
        name: 'amqp',
        type: 'group',
        fields: [
          {
            name: 'reply-code',
            type: 'long',
            description: 'AMQP reply code to an error, similar to http reply-code',
            example: 404,
          },
          {
            name: 'reply-text',
            type: 'keyword',
            description: 'Text explaining the error.',
          },
          {
            name: 'class-id',
            type: 'long',
            description: 'Failing method class.',
          },
          {
            name: 'method-id',
            type: 'long',
            description: 'Failing method ID.',
          },
          {
            name: 'exchange',
            type: 'keyword',
            description: 'Name of the exchange.',
          },
          {
            name: 'exchange-type',
            type: 'keyword',
            description: 'Exchange type.',
            example: 'fanout',
          },
          {
            name: 'passive',
            type: 'boolean',
            description: 'If set, do not create exchange/queue.',
          },
          {
            name: 'durable',
            type: 'boolean',
            description: 'If set, request a durable exchange/queue.',
          },
          {
            name: 'exclusive',
            type: 'boolean',
            description: 'If set, request an exclusive queue.',
          },
          {
            name: 'auto-delete',
            type: 'boolean',
            description: 'If set, auto-delete queue when unused.',
          },
          {
            name: 'no-wait',
            type: 'boolean',
            description: 'If set, the server will not respond to the method.',
          },
          {
            name: 'consumer-tag',
            description: 'Identifier for the consumer, valid within the current channel.',
          },
          {
            name: 'delivery-tag',
            type: 'long',
            description: 'The server-assigned and channel-specific delivery tag.',
          },
          {
            name: 'message-count',
            type: 'long',
            description:
              'The number of messages in the queue, which will be zero for newly-declared queues.',
          },
          {
            name: 'consumer-count',
            type: 'long',
            description: 'The number of consumers of a queue.',
          },
          {
            name: 'routing-key',
            type: 'keyword',
            description: 'Message routing key.',
          },
          {
            name: 'no-ack',
            type: 'boolean',
            description: 'If set, the server does not expect acknowledgements for messages.',
          },
          {
            name: 'no-local',
            type: 'boolean',
            description:
              'If set, the server will not send messages to the connection that published them.',
          },
          {
            name: 'if-unused',
            type: 'boolean',
            description: 'Delete only if unused.',
          },
          {
            name: 'if-empty',
            type: 'boolean',
            description: 'Delete only if empty.',
          },
          {
            name: 'queue',
            type: 'keyword',
            description: 'The queue name identifies the queue within the vhost.',
          },
          {
            name: 'redelivered',
            type: 'boolean',
            description:
              'Indicates that the message has been previously delivered to this or another client.',
          },
          {
            name: 'multiple',
            type: 'boolean',
            description: 'Acknowledge multiple messages.',
          },
          {
            name: 'arguments',
            type: 'object',
            description:
              'Optional additional arguments passed to some methods. Can be of various types.',
          },
          {
            name: 'mandatory',
            type: 'boolean',
            description: 'Indicates mandatory routing.',
          },
          {
            name: 'immediate',
            type: 'boolean',
            description: 'Request immediate delivery.',
          },
          {
            name: 'content-type',
            type: 'keyword',
            description: 'MIME content type.',
            example: 'text/plain',
          },
          {
            name: 'content-encoding',
            type: 'keyword',
            description: 'MIME content encoding.',
          },
          {
            name: 'headers',
            type: 'object',
            object_type: 'keyword',
            description: 'Message header field table.',
          },
          {
            name: 'delivery-mode',
            type: 'keyword',
            description: 'Non-persistent (1) or persistent (2).',
          },
          {
            name: 'priority',
            type: 'long',
            description: 'Message priority, 0 to 9.',
          },
          {
            name: 'correlation-id',
            type: 'keyword',
            description: 'Application correlation identifier.',
          },
          {
            name: 'reply-to',
            type: 'keyword',
            description: 'Address to reply to.',
          },
          {
            name: 'expiration',
            type: 'keyword',
            description: 'Message expiration specification.',
          },
          {
            name: 'message-id',
            type: 'keyword',
            description: 'Application message identifier.',
          },
          {
            name: 'timestamp',
            type: 'keyword',
            description: 'Message timestamp.',
          },
          {
            name: 'type',
            type: 'keyword',
            description: 'Message type name.',
          },
          {
            name: 'user-id',
            type: 'keyword',
            description: 'Creating user id.',
          },
          {
            name: 'app-id',
            type: 'keyword',
            description: 'Creating application id.',
          },
        ],
      },
    ],
  },
  {
    key: 'cassandra',
    title: 'Cassandra',
    description: 'Cassandra v4/3 specific event fields.',
    fields: [
      {
        name: 'no_request',
        type: 'alias',
        path: 'cassandra.no_request',
        migration: true,
      },
      {
        name: 'cassandra',
        type: 'group',
        description: 'Information about the Cassandra request and response.',
        fields: [
          {
            name: 'no_request',
            type: 'boolean',
            description: 'Indicates that there is no request because this is a PUSH message.',
          },
          {
            name: 'request',
            type: 'group',
            description: 'Cassandra request.',
            fields: [
              {
                name: 'headers',
                type: 'group',
                description: 'Cassandra request headers.',
                fields: [
                  {
                    name: 'version',
                    type: 'long',
                    description: 'The version of the protocol.',
                  },
                  {
                    name: 'flags',
                    type: 'keyword',
                    description: 'Flags applying to this frame.',
                  },
                  {
                    name: 'stream',
                    type: 'keyword',
                    description:
                      'A frame has a stream id.  If a client sends a request message with the stream id X, it is guaranteed that the stream id of the response to that message will be X.',
                  },
                  {
                    name: 'op',
                    type: 'keyword',
                    description: 'An operation type that distinguishes the actual message.',
                  },
                  {
                    name: 'length',
                    type: 'long',
                    description:
                      'A integer representing the length of the body of the frame (a frame is limited to 256MB in length).',
                  },
                ],
              },
              {
                name: 'query',
                type: 'keyword',
                description: 'The CQL query which client send to cassandra.',
              },
            ],
          },
          {
            name: 'response',
            type: 'group',
            description: 'Cassandra response.',
            fields: [
              {
                name: 'headers',
                type: 'group',
                description:
                  "Cassandra response headers, the structure is as same as request's header.",
                fields: [
                  {
                    name: 'version',
                    type: 'long',
                    description: 'The version of the protocol.',
                  },
                  {
                    name: 'flags',
                    type: 'keyword',
                    description: 'Flags applying to this frame.',
                  },
                  {
                    name: 'stream',
                    type: 'keyword',
                    description:
                      'A frame has a stream id.  If a client sends a request message with the stream id X, it is guaranteed that the stream id of the response to that message will be X.',
                  },
                  {
                    name: 'op',
                    type: 'keyword',
                    description: 'An operation type that distinguishes the actual message.',
                  },
                  {
                    name: 'length',
                    type: 'long',
                    description:
                      'A integer representing the length of the body of the frame (a frame is limited to 256MB in length).',
                  },
                ],
              },
              {
                name: 'result',
                type: 'group',
                description: 'Details about the returned result.',
                fields: [
                  {
                    name: 'type',
                    type: 'keyword',
                    description: 'Cassandra result type.',
                  },
                  {
                    name: 'rows',
                    type: 'group',
                    description: 'Details about the rows.',
                    fields: [
                      {
                        name: 'num_rows',
                        type: 'long',
                        description: 'Representing the number of rows present in this result.',
                      },
                      {
                        name: 'meta',
                        type: 'group',
                        description: 'Composed of result metadata.',
                        fields: [
                          {
                            name: 'keyspace',
                            type: 'keyword',
                            description:
                              'Only present after set Global_tables_spec, the keyspace name.',
                          },
                          {
                            name: 'table',
                            type: 'keyword',
                            description:
                              'Only present after set Global_tables_spec, the table name.',
                          },
                          {
                            name: 'flags',
                            type: 'keyword',
                            description:
                              'Provides information on the formatting of the remaining information.',
                          },
                          {
                            name: 'col_count',
                            type: 'long',
                            description:
                              'Representing the number of columns selected by the query that produced this result.',
                          },
                          {
                            name: 'pkey_columns',
                            type: 'long',
                            description: 'Representing the PK columns index and counts.',
                          },
                          {
                            name: 'paging_state',
                            type: 'keyword',
                            description:
                              'The paging_state is a bytes value that should be used in QUERY/EXECUTE to continue paging and retrieve the remainder of the result for this query.',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'keyspace',
                    type: 'keyword',
                    description: 'Indicating the name of the keyspace that has been set.',
                  },
                  {
                    name: 'schema_change',
                    type: 'group',
                    description: 'The result to a schema_change message.',
                    fields: [
                      {
                        name: 'change',
                        type: 'keyword',
                        description: 'Representing the type of changed involved.',
                      },
                      {
                        name: 'keyspace',
                        type: 'keyword',
                        description: 'This describes which keyspace has changed.',
                      },
                      {
                        name: 'table',
                        type: 'keyword',
                        description: 'This describes which table has changed.',
                      },
                      {
                        name: 'object',
                        type: 'keyword',
                        description:
                          'This describes the name of said affected object (either the table, user type, function, or aggregate name).',
                      },
                      {
                        name: 'target',
                        type: 'keyword',
                        description:
                          'Target could be "FUNCTION" or "AGGREGATE", multiple arguments.',
                      },
                      {
                        name: 'name',
                        type: 'keyword',
                        description: 'The function/aggregate name.',
                      },
                      {
                        name: 'args',
                        type: 'keyword',
                        description: 'One string for each argument type (as CQL type).',
                      },
                    ],
                  },
                  {
                    name: 'prepared',
                    type: 'group',
                    description: 'The result to a PREPARE message.',
                    fields: [
                      {
                        name: 'prepared_id',
                        type: 'keyword',
                        description: 'Representing the prepared query ID.',
                      },
                      {
                        name: 'req_meta',
                        type: 'group',
                        description: 'This describes the request metadata.',
                        fields: [
                          {
                            name: 'keyspace',
                            type: 'keyword',
                            description:
                              'Only present after set Global_tables_spec, the keyspace name.',
                          },
                          {
                            name: 'table',
                            type: 'keyword',
                            description:
                              'Only present after set Global_tables_spec, the table name.',
                          },
                          {
                            name: 'flags',
                            type: 'keyword',
                            description:
                              'Provides information on the formatting of the remaining information.',
                          },
                          {
                            name: 'col_count',
                            type: 'long',
                            description:
                              'Representing the number of columns selected by the query that produced this result.',
                          },
                          {
                            name: 'pkey_columns',
                            type: 'long',
                            description: 'Representing the PK columns index and counts.',
                          },
                          {
                            name: 'paging_state',
                            type: 'keyword',
                            description:
                              'The paging_state is a bytes value that should be used in QUERY/EXECUTE to continue paging and retrieve the remainder of the result for this query.',
                          },
                        ],
                      },
                      {
                        name: 'resp_meta',
                        type: 'group',
                        description: 'This describes the metadata for the result set.',
                        fields: [
                          {
                            name: 'keyspace',
                            type: 'keyword',
                            description:
                              'Only present after set Global_tables_spec, the keyspace name.',
                          },
                          {
                            name: 'table',
                            type: 'keyword',
                            description:
                              'Only present after set Global_tables_spec, the table name.',
                          },
                          {
                            name: 'flags',
                            type: 'keyword',
                            description:
                              'Provides information on the formatting of the remaining information.',
                          },
                          {
                            name: 'col_count',
                            type: 'long',
                            description:
                              'Representing the number of columns selected by the query that produced this result.',
                          },
                          {
                            name: 'pkey_columns',
                            type: 'long',
                            description: 'Representing the PK columns index and counts.',
                          },
                          {
                            name: 'paging_state',
                            type: 'keyword',
                            description:
                              'The paging_state is a bytes value that should be used in QUERY/EXECUTE to continue paging and retrieve the remainder of the result for this query.',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                name: 'supported',
                type: 'object',
                object_type: 'keyword',
                description:
                  'Indicates which startup options are supported by the server. This message comes as a response to an OPTIONS message.',
              },
              {
                name: 'authentication',
                type: 'group',
                description:
                  'Indicates that the server requires authentication, and which authentication mechanism to use.',
                fields: [
                  {
                    name: 'class',
                    type: 'keyword',
                    description: 'Indicates the full class name of the IAuthenticator in use',
                  },
                ],
              },
              {
                name: 'warnings',
                type: 'keyword',
                description: 'The text of the warnings, only occur when Warning flag was set.',
              },
              {
                name: 'event',
                type: 'group',
                description:
                  'Event pushed by the server. A client will only receive events for the types it has REGISTERed to.',
                fields: [
                  {
                    name: 'type',
                    type: 'keyword',
                    description: 'Representing the event type.',
                  },
                  {
                    name: 'change',
                    type: 'keyword',
                    description:
                      'The message corresponding respectively to the type of change followed by the address of the new/removed node.',
                  },
                  {
                    name: 'host',
                    type: 'keyword',
                    description: 'Representing the node ip.',
                  },
                  {
                    name: 'port',
                    type: 'long',
                    description: 'Representing the node port.',
                  },
                  {
                    name: 'schema_change',
                    type: 'group',
                    description: 'The events details related to schema change.',
                    fields: [
                      {
                        name: 'change',
                        type: 'keyword',
                        description: 'Representing the type of changed involved.',
                      },
                      {
                        name: 'keyspace',
                        type: 'keyword',
                        description: 'This describes which keyspace has changed.',
                      },
                      {
                        name: 'table',
                        type: 'keyword',
                        description: 'This describes which table has changed.',
                      },
                      {
                        name: 'object',
                        type: 'keyword',
                        description:
                          'This describes the name of said affected object (either the table, user type, function, or aggregate name).',
                      },
                      {
                        name: 'target',
                        type: 'keyword',
                        description:
                          'Target could be "FUNCTION" or "AGGREGATE", multiple arguments.',
                      },
                      {
                        name: 'name',
                        type: 'keyword',
                        description: 'The function/aggregate name.',
                      },
                      {
                        name: 'args',
                        type: 'keyword',
                        description: 'One string for each argument type (as CQL type).',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'error',
                type: 'group',
                description:
                  'Indicates an error processing a request. The body of the message will be an  error code followed by a error message. Then, depending on the exception, more content may follow.',
                fields: [
                  {
                    name: 'code',
                    type: 'long',
                    description: 'The error code of the Cassandra response.',
                  },
                  {
                    name: 'msg',
                    type: 'keyword',
                    description: 'The error message of the Cassandra response.',
                  },
                  {
                    name: 'type',
                    type: 'keyword',
                    description: 'The error type of the Cassandra response.',
                  },
                  {
                    name: 'details',
                    type: 'group',
                    description: 'The details of the error.',
                    fields: [
                      {
                        name: 'read_consistency',
                        type: 'keyword',
                        description:
                          'Representing the consistency level of the query that triggered the exception.',
                      },
                      {
                        name: 'required',
                        type: 'long',
                        description:
                          'Representing the number of nodes that should be alive to respect consistency level.',
                      },
                      {
                        name: 'alive',
                        type: 'long',
                        description:
                          'Representing the number of replicas that were known to be alive when the request had been processed (since an unavailable exception has been triggered).',
                      },
                      {
                        name: 'received',
                        type: 'long',
                        description:
                          'Representing the number of nodes having acknowledged the request.',
                      },
                      {
                        name: 'blockfor',
                        type: 'long',
                        description:
                          'Representing the number of replicas whose acknowledgement is required to achieve consistency level.',
                      },
                      {
                        name: 'write_type',
                        type: 'keyword',
                        description: 'Describe the type of the write that timed out.',
                      },
                      {
                        name: 'data_present',
                        type: 'boolean',
                        description: 'It means the replica that was asked for data had responded.',
                      },
                      {
                        name: 'keyspace',
                        type: 'keyword',
                        description: 'The keyspace of the failed function.',
                      },
                      {
                        name: 'table',
                        type: 'keyword',
                        description: 'The keyspace of the failed function.',
                      },
                      {
                        name: 'stmt_id',
                        type: 'keyword',
                        description: 'Representing the unknown ID.',
                      },
                      {
                        name: 'num_failures',
                        type: 'keyword',
                        description:
                          'Representing the number of nodes that experience a failure while executing the request.',
                      },
                      {
                        name: 'function',
                        type: 'keyword',
                        description: 'The name of the failed function.',
                      },
                      {
                        name: 'arg_types',
                        type: 'keyword',
                        description:
                          'One string for each argument type (as CQL type) of the failed function.',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'dhcpv4',
    title: 'DHCPv4',
    description: 'DHCPv4 event fields',
    fields: [
      {
        name: 'dhcpv4',
        type: 'group',
        fields: [
          {
            name: 'transaction_id',
            type: 'keyword',
            description:
              'Transaction ID, a random number chosen by the client, used by the client and server to associate messages and responses between a client and a server.',
          },
          {
            name: 'seconds',
            type: 'long',
            description:
              'Number of seconds elapsed since client began address acquisition or renewal process.',
          },
          {
            name: 'flags',
            type: 'keyword',
            description:
              'Flags are set by the client to indicate how the DHCP server should its reply -- either unicast or broadcast.',
          },
          {
            name: 'client_ip',
            type: 'ip',
            description: 'The current IP address of the client.',
          },
          {
            name: 'assigned_ip',
            type: 'ip',
            description:
              'The IP address that the DHCP server is assigning to the client. This field is also known as "your" IP address.',
          },
          {
            name: 'server_ip',
            type: 'ip',
            description:
              'The IP address of the DHCP server that the client should use for the next step in the bootstrap process.',
          },
          {
            name: 'relay_ip',
            type: 'ip',
            description:
              'The relay IP address used by the client to contact the server (i.e. a DHCP relay server).',
          },
          {
            name: 'client_mac',
            type: 'keyword',
            description: "The client's MAC address (layer two).",
          },
          {
            name: 'server_name',
            type: 'keyword',
            description:
              'The name of the server sending the message. Optional. Used in DHCPOFFER or DHCPACK messages.',
          },
          {
            name: 'op_code',
            type: 'keyword',
            example: 'bootreply',
            description: 'The message op code (bootrequest or bootreply).',
          },
          {
            name: 'hops',
            type: 'long',
            description: 'The number of hops the DHCP message went through.',
          },
          {
            name: 'hardware_type',
            type: 'keyword',
            description:
              'The type of hardware used for the local network (Ethernet, LocalTalk, etc).',
          },
          {
            name: 'option',
            type: 'group',
            fields: [
              {
                name: 'message_type',
                type: 'keyword',
                example: 'ack',
                description:
                  'The specific type of DHCP message being sent (e.g. discover, offer, request, decline, ack, nak, release, inform).',
              },
              {
                name: 'parameter_request_list',
                type: 'keyword',
                description:
                  'This option is used by a DHCP client to request values for specified configuration parameters.',
              },
              {
                name: 'requested_ip_address',
                type: 'ip',
                description:
                  'This option is used in a client request (DHCPDISCOVER) to allow the client to request that a particular IP address be assigned.',
              },
              {
                name: 'server_identifier',
                type: 'ip',
                description: 'IP address of the individual DHCP server which handled this message.',
              },
              {
                name: 'broadcast_address',
                type: 'ip',
                description:
                  "This option specifies the broadcast address in use on the client's subnet. ",
              },
              {
                name: 'max_dhcp_message_size',
                type: 'long',
                description:
                  'This option specifies the maximum length DHCP message that the client is willing to accept.',
              },
              {
                name: 'class_identifier',
                type: 'keyword',
                description:
                  "This option is used by DHCP clients to optionally identify the vendor type and configuration of a DHCP client. Vendors may choose to define specific vendor class identifiers to convey particular configuration or other identification information about a client.  For example, the identifier may encode the client's hardware configuration. ",
              },
              {
                name: 'domain_name',
                type: 'keyword',
                description:
                  'This option specifies the domain name that client should use when resolving hostnames via the Domain Name System.',
              },
              {
                name: 'dns_servers',
                type: 'ip',
                description:
                  'The domain name server option specifies a list of Domain Name System servers available to the client.',
              },
              {
                name: 'vendor_identifying_options',
                type: 'object',
                description:
                  'A DHCP client may use this option to unambiguously identify the vendor that manufactured the hardware on which the client is running, the software in use, or an industry consortium to which the vendor belongs. This field is described in RFC 3925.',
              },
              {
                name: 'subnet_mask',
                type: 'ip',
                description: 'The subnet mask that the client should use on the currnet network.',
              },
              {
                name: 'utc_time_offset_sec',
                type: 'long',
                description:
                  "The time offset field specifies the offset of the client's subnet in seconds from Coordinated Universal Time (UTC). ",
              },
              {
                name: 'router',
                type: 'ip',
                description:
                  "The router option specifies a list of IP addresses for routers on the client's subnet. ",
              },
              {
                name: 'time_servers',
                type: 'ip',
                description:
                  'The time server option specifies a list of RFC 868 time servers available to the client.',
              },
              {
                name: 'ntp_servers',
                type: 'ip',
                description:
                  'This option specifies a list of IP addresses indicating NTP servers available to the client.',
              },
              {
                name: 'hostname',
                type: 'keyword',
                description: 'This option specifies the name of the client.',
              },
              {
                name: 'ip_address_lease_time_sec',
                type: 'long',
                description:
                  'This option is used in a client request (DHCPDISCOVER or DHCPREQUEST) to allow the client to request a lease time for the IP address.  In a server reply (DHCPOFFER), a DHCP server uses this option to specify the lease time it is willing to offer.',
              },
              {
                name: 'message',
                type: 'text',
                description:
                  'This option is used by a DHCP server to provide an error message to a DHCP client in a DHCPNAK message in the event of a failure. A client may use this option in a DHCPDECLINE message to indicate the why the client declined the offered parameters.',
              },
              {
                name: 'renewal_time_sec',
                type: 'long',
                description:
                  'This option specifies the time interval from address assignment until the client transitions to the RENEWING state.',
              },
              {
                name: 'rebinding_time_sec',
                type: 'long',
                description:
                  'This option specifies the time interval from address assignment until the client transitions to the REBINDING state.',
              },
              {
                name: 'boot_file_name',
                type: 'keyword',
                description:
                  "This option is used to identify a bootfile when the 'file' field in the DHCP header has been used for DHCP options. ",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'dns',
    title: 'DNS',
    description: 'DNS-specific event fields.',
    fields: [
      {
        name: 'dns',
        type: 'group',
        fields: [
          {
            name: 'id',
            type: 'long',
            description:
              'The DNS packet identifier assigned by the program that generated the query. The identifier is copied to the response.',
          },
          {
            name: 'op_code',
            description:
              'The DNS operation code that specifies the kind of query in the message. This value is set by the originator of a query and copied into the response.',
            example: 'QUERY',
          },
          {
            name: 'flags.authoritative',
            type: 'boolean',
            description:
              'A DNS flag specifying that the responding server is an authority for the domain name used in the question.',
          },
          {
            name: 'flags.recursion_available',
            type: 'boolean',
            description:
              'A DNS flag specifying whether recursive query support is available in the name server.',
          },
          {
            name: 'flags.recursion_desired',
            type: 'boolean',
            description:
              'A DNS flag specifying that the client directs the server to pursue a query recursively. Recursive query support is optional.',
          },
          {
            name: 'flags.authentic_data',
            type: 'boolean',
            description:
              'A DNS flag specifying that the recursive server considers the response authentic.',
          },
          {
            name: 'flags.checking_disabled',
            type: 'boolean',
            description:
              'A DNS flag specifying that the client disables the server signature validation of the query.',
          },
          {
            name: 'flags.truncated_response',
            type: 'boolean',
            description:
              'A DNS flag specifying that only the first 512 bytes of the reply were returned.',
          },
          {
            name: 'response_code',
            description: 'The DNS status code.',
            example: 'NOERROR',
          },
          {
            name: 'question.name',
            description:
              'The domain name being queried. If the name field contains non-printable characters (below 32 or above 126), then those characters are represented as escaped base 10 integers (\\DDD). Back slashes and quotes are escaped. Tabs, carriage returns, and line feeds are converted to \\t, \\r, and   respectively.',
            example: 'www.google.com.',
          },
          {
            name: 'question.type',
            description: 'The type of records being queried.',
            example: 'AAAA',
          },
          {
            name: 'question.class',
            description: 'The class of of records being queried.',
            example: 'IN',
          },
          {
            name: 'question.etld_plus_one',
            description:
              'The effective top-level domain (eTLD) plus one more label. For example, the eTLD+1 for "foo.bar.golang.org." is "golang.org.". The data for determining the eTLD comes from an embedded copy of the data from http://publicsuffix.org.',
            example: 'amazon.co.uk.',
          },
          {
            name: 'answers',
            type: 'object',
            description:
              'An array containing a dictionary about each answer section returned by the server.',
          },
          {
            name: 'answers_count',
            type: 'long',
            description: 'The number of resource records contained in the `dns.answers` field.',
          },
          {
            name: 'answers.name',
            description: 'The domain name to which this resource record pertains.',
            example: 'example.com.',
          },
          {
            name: 'answers.type',
            description: 'The type of data contained in this resource record.',
            example: 'MX',
          },
          {
            name: 'answers.class',
            description: 'The class of DNS data contained in this resource record.',
            example: 'IN',
          },
          {
            name: 'answers.ttl',
            description:
              'The time interval in seconds that this resource record may be cached before it should be discarded. Zero values mean that the data should not be cached.',
            type: 'long',
          },
          {
            name: 'answers.data',
            description:
              'The data describing the resource. The meaning of this data depends on the type and class of the resource record.',
          },
          {
            name: 'authorities',
            type: 'object',
            description:
              'An array containing a dictionary for each authority section from the answer.',
          },
          {
            name: 'authorities_count',
            type: 'long',
            description:
              'The number of resource records contained in the `dns.authorities` field. The `dns.authorities` field may or may not be included depending on the configuration of Packetbeat.',
          },
          {
            name: 'authorities.name',
            description: 'The domain name to which this resource record pertains.',
            example: 'example.com.',
          },
          {
            name: 'authorities.type',
            description: 'The type of data contained in this resource record.',
            example: 'NS',
          },
          {
            name: 'authorities.class',
            description: 'The class of DNS data contained in this resource record.',
            example: 'IN',
          },
          {
            name: 'additionals',
            type: 'object',
            description:
              'An array containing a dictionary for each additional section from the answer.',
          },
          {
            name: 'additionals_count',
            type: 'long',
            description:
              'The number of resource records contained in the `dns.additionals` field. The `dns.additionals` field may or may not be included depending on the configuration of Packetbeat.',
          },
          {
            name: 'additionals.name',
            description: 'The domain name to which this resource record pertains.',
            example: 'example.com.',
          },
          {
            name: 'additionals.type',
            description: 'The type of data contained in this resource record.',
            example: 'NS',
          },
          {
            name: 'additionals.class',
            description: 'The class of DNS data contained in this resource record.',
            example: 'IN',
          },
          {
            name: 'additionals.ttl',
            description:
              'The time interval in seconds that this resource record may be cached before it should be discarded. Zero values mean that the data should not be cached.',
            type: 'long',
          },
          {
            name: 'additionals.data',
            description:
              'The data describing the resource. The meaning of this data depends on the type and class of the resource record.',
          },
          {
            name: 'opt.version',
            description: 'The EDNS version.',
            example: '0',
          },
          {
            name: 'opt.do',
            type: 'boolean',
            description: 'If set, the transaction uses DNSSEC.',
          },
          {
            name: 'opt.ext_rcode',
            description: 'Extended response code field.',
            example: 'BADVERS',
          },
          {
            name: 'opt.udp_size',
            type: 'long',
            description: "Requestor's UDP payload size (in bytes).",
          },
        ],
      },
    ],
  },
  {
    key: 'http',
    title: 'HTTP',
    description: 'HTTP-specific event fields.',
    fields: [
      {
        name: 'http',
        type: 'group',
        description: 'Information about the HTTP request and response.',
        fields: [
          {
            name: 'request',
            description: 'HTTP request',
            type: 'group',
            fields: [
              {
                name: 'headers',
                type: 'object',
                object_type: 'keyword',
                description:
                  'A map containing the captured header fields from the request. Which headers to capture is configurable. If headers with the same header name are present in the message, they will be separated by commas.',
              },
              {
                name: 'params',
                type: 'alias',
                migration: true,
                path: 'url.query',
              },
            ],
          },
          {
            name: 'response',
            description: 'HTTP response',
            type: 'group',
            fields: [
              {
                name: 'status_phrase',
                description: 'The HTTP status phrase.',
                example: 'Not Found',
              },
              {
                name: 'headers',
                type: 'object',
                object_type: 'keyword',
                description:
                  'A map containing the captured header fields from the response. Which headers to capture is configurable. If headers with the same header name are present in the message, they will be separated by commas.',
              },
              {
                name: 'code',
                type: 'alias',
                migration: true,
                path: 'http.response.status_code',
              },
              {
                name: 'phrase',
                type: 'alias',
                migration: true,
                path: 'http.response.status_phrase',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'icmp',
    title: 'ICMP',
    description: 'ICMP specific event fields.',
    fields: [
      {
        name: 'icmp',
        type: 'group',
        fields: [
          {
            name: 'version',
            description: 'The version of the ICMP protocol.',
            possible_values: [4, 6],
          },
          {
            name: 'request.message',
            type: 'keyword',
            description: 'A human readable form of the request.',
          },
          {
            name: 'request.type',
            type: 'long',
            description: 'The request type.',
          },
          {
            name: 'request.code',
            type: 'long',
            description: 'The request code.',
          },
          {
            name: 'response.message',
            type: 'keyword',
            description: 'A human readable form of the response.',
          },
          {
            name: 'response.type',
            type: 'long',
            description: 'The response type.',
          },
          {
            name: 'response.code',
            type: 'long',
            description: 'The response code.',
          },
        ],
      },
    ],
  },
  {
    key: 'memcache',
    title: 'Memcache',
    description: 'Memcached-specific event fields',
    fields: [
      {
        name: 'memcache',
        type: 'group',
        fields: [
          {
            name: 'protocol_type',
            type: 'keyword',
            description:
              'The memcache protocol implementation. The value can be "binary" for binary-based, "text" for text-based, or "unknown" for an unknown memcache protocol type.',
          },
          {
            name: 'request.line',
            type: 'keyword',
            description: 'The raw command line for unknown commands ONLY.',
          },
          {
            name: 'request.command',
            type: 'keyword',
            description:
              'The memcache command being requested in the memcache text protocol. For example "set" or "get". The binary protocol opcodes are translated into memcache text protocol commands.',
          },
          {
            name: 'response.command',
            type: 'keyword',
            description:
              'Either the text based protocol response message type or the name of the originating request if binary protocol is used.',
          },
          {
            name: 'request.type',
            type: 'keyword',
            description:
              'The memcache command classification. This value can be "UNKNOWN", "Load", "Store", "Delete", "Counter", "Info", "SlabCtrl", "LRUCrawler", "Stats", "Success", "Fail", or "Auth".',
          },
          {
            name: 'response.type',
            type: 'keyword',
            description:
              'The memcache command classification. This value can be "UNKNOWN", "Load", "Store", "Delete", "Counter", "Info", "SlabCtrl", "LRUCrawler", "Stats", "Success", "Fail", or "Auth". The text based protocol will employ any of these, whereas the binary based protocol will mirror the request commands only (see `memcache.response.status` for binary protocol).',
          },
          {
            name: 'response.error_msg',
            type: 'keyword',
            description:
              'The optional error message in the memcache response (text based protocol only).',
          },
          {
            name: 'request.opcode',
            type: 'keyword',
            description: 'The binary protocol message opcode name.',
          },
          {
            name: 'response.opcode',
            type: 'keyword',
            description: 'The binary protocol message opcode name.',
          },
          {
            name: 'request.opcode_value',
            type: 'long',
            description: 'The binary protocol message opcode value.',
          },
          {
            name: 'response.opcode_value',
            type: 'long',
            description: 'The binary protocol message opcode value.',
          },
          {
            name: 'request.opaque',
            type: 'long',
            description:
              'The binary protocol opaque header value used for correlating request with response messages.',
          },
          {
            name: 'response.opaque',
            type: 'long',
            description:
              'The binary protocol opaque header value used for correlating request with response messages.',
          },
          {
            name: 'request.vbucket',
            type: 'long',
            description: 'The vbucket index sent in the binary message.',
          },
          {
            name: 'response.status',
            type: 'keyword',
            description:
              'The textual representation of the response error code (binary protocol only).',
          },
          {
            name: 'response.status_code',
            type: 'long',
            description: 'The status code value returned in the response (binary protocol only).',
          },
          {
            name: 'request.keys',
            type: 'array',
            description: 'The list of keys sent in the store or load commands.',
          },
          {
            name: 'response.keys',
            type: 'array',
            description: 'The list of keys returned for the load command (if present).',
          },
          {
            name: 'request.count_values',
            type: 'long',
            description:
              'The number of values found in the memcache request message. If the command does not send any data, this field is missing.',
          },
          {
            name: 'response.count_values',
            type: 'long',
            description:
              'The number of values found in the memcache response message. If the command does not send any data, this field is missing.',
          },
          {
            name: 'request.values',
            type: 'array',
            description: 'The list of base64 encoded values sent with the request (if present).',
          },
          {
            name: 'response.values',
            type: 'array',
            description: 'The list of base64 encoded values sent with the response (if present).',
          },
          {
            name: 'request.bytes',
            type: 'long',
            format: 'bytes',
            description: 'The byte count of the values being transferred.',
          },
          {
            name: 'response.bytes',
            type: 'long',
            format: 'bytes',
            description: 'The byte count of the values being transferred.',
          },
          {
            name: 'request.delta',
            type: 'long',
            description: 'The counter increment/decrement delta value.',
          },
          {
            name: 'request.initial',
            type: 'long',
            description:
              'The counter increment/decrement initial value parameter (binary protocol only).',
          },
          {
            name: 'request.verbosity',
            type: 'long',
            description: 'The value of the memcache "verbosity" command.',
          },
          {
            name: 'request.raw_args',
            type: 'keyword',
            description:
              'The text protocol raw arguments for the "stats ..." and "lru crawl ..." commands.',
          },
          {
            name: 'request.source_class',
            type: 'long',
            description: "The source class id in 'slab reassign' command. ",
          },
          {
            name: 'request.dest_class',
            type: 'long',
            description: "The destination class id in 'slab reassign' command. ",
          },
          {
            name: 'request.automove',
            type: 'keyword',
            description:
              'The automove mode in the \'slab automove\' command expressed as a string. This value can be "standby"(=0), "slow"(=1), "aggressive"(=2), or the raw value if the value is unknown.',
          },
          {
            name: 'request.flags',
            type: 'long',
            description: 'The memcache command flags sent in the request (if present).',
          },
          {
            name: 'response.flags',
            type: 'long',
            description: 'The memcache message flags sent in the response (if present).',
          },
          {
            name: 'request.exptime',
            type: 'long',
            description:
              'The data expiry time in seconds sent with the memcache command (if present). If the value is <30 days, the expiry time is relative to "now", or else it is an absolute Unix time in seconds (32-bit).',
          },
          {
            name: 'request.sleep_us',
            type: 'long',
            description: "The sleep setting in microseconds for the 'lru_crawler sleep' command. ",
          },
          {
            name: 'response.value',
            type: 'long',
            description: 'The counter value returned by a counter operation.',
          },
          {
            name: 'request.noreply',
            type: 'boolean',
            description:
              'Set to true if noreply was set in the request. The `memcache.response` field will be missing.',
          },
          {
            name: 'request.quiet',
            type: 'boolean',
            description:
              'Set to true if the binary protocol message is to be treated as a quiet message.',
          },
          {
            name: 'request.cas_unique',
            type: 'long',
            description: 'The CAS (compare-and-swap) identifier if present.',
          },
          {
            name: 'response.cas_unique',
            type: 'long',
            description:
              'The CAS (compare-and-swap) identifier to be used with CAS-based updates (if present).',
          },
          {
            name: 'response.stats',
            type: 'array',
            description:
              'The list of statistic values returned. Each entry is a dictionary with the fields "name" and "value".',
          },
          {
            name: 'response.version',
            type: 'keyword',
            description: 'The returned memcache version string.',
          },
        ],
      },
    ],
  },
  {
    key: 'mongodb',
    title: 'MongoDb',
    description:
      'MongoDB-specific event fields. These fields mirror closely the fields for the MongoDB wire protocol. The higher level fields (for example, `query` and `resource`) apply to MongoDB events as well.',
    fields: [
      {
        name: 'mongodb',
        type: 'group',
        fields: [
          {
            name: 'error',
            description:
              'If the MongoDB request has resulted in an error, this field contains the error message returned by the server.',
          },
          {
            name: 'fullCollectionName',
            description:
              'The full collection name. The full collection name is the concatenation of the database name with the collection name, using a dot (.) for the concatenation. For example, for the database foo and the collection bar, the full collection name is foo.bar.',
          },
          {
            name: 'numberToSkip',
            type: 'long',
            description:
              'Sets the number of documents to omit - starting from the first document in the resulting dataset - when returning the result of the query.',
          },
          {
            name: 'numberToReturn',
            type: 'long',
            description: 'The requested maximum number of documents to be returned.',
          },
          {
            name: 'numberReturned',
            type: 'long',
            description: 'The number of documents in the reply.',
          },
          {
            name: 'startingFrom',
            description: 'Where in the cursor this reply is starting.',
          },
          {
            name: 'query',
            description:
              'A JSON document that represents the query. The query will contain one or more elements, all of which must match for a document to be included in the result set. Possible elements include $query, $orderby, $hint, $explain, and $snapshot.',
          },
          {
            name: 'returnFieldsSelector',
            description:
              'A JSON document that limits the fields in the returned documents. The returnFieldsSelector contains one or more elements, each of which is the name of a field that should be returned, and the integer value 1.',
          },
          {
            name: 'selector',
            description:
              'A BSON document that specifies the query for selecting the document to update or delete.',
          },
          {
            name: 'update',
            description:
              'A BSON document that specifies the update to be performed. For information on specifying updates, see the Update Operations documentation from the MongoDB Manual.',
          },
          {
            name: 'cursorId',
            description:
              'The cursor identifier returned in the OP_REPLY. This must be the value that was returned from the database.',
          },
        ],
      },
    ],
  },
  {
    key: 'mysql',
    title: 'MySQL',
    description: 'MySQL-specific event fields.',
    fields: [
      {
        name: 'mysql',
        type: 'group',
        fields: [
          {
            name: 'affected_rows',
            type: 'long',
            description:
              'If the MySQL command is successful, this field contains the affected number of rows of the last statement.',
          },
          {
            name: 'insert_id',
            description:
              'If the INSERT query is successful, this field contains the id of the newly inserted row.',
          },
          {
            name: 'num_fields',
            description:
              'If the SELECT query is successful, this field is set to the number of fields returned.',
          },
          {
            name: 'num_rows',
            description:
              'If the SELECT query is successful, this field is set to the number of rows returned.',
          },
          {
            name: 'query',
            description: "The row mysql query as read from the transaction's request. ",
          },
          {
            name: 'error_code',
            type: 'long',
            description: 'The error code returned by MySQL.',
          },
          {
            name: 'error_message',
            description: 'The error info message returned by MySQL.',
          },
        ],
      },
    ],
  },
  {
    key: 'nfs',
    title: 'NFS',
    description: 'NFS v4/3 specific event fields.',
    fields: [
      {
        name: 'nfs',
        type: 'group',
        fields: [
          {
            name: 'version',
            type: 'long',
            description: 'NFS protocol version number.',
          },
          {
            name: 'minor_version',
            type: 'long',
            description: 'NFS protocol minor version number.',
          },
          {
            name: 'tag',
            description: 'NFS v4 COMPOUND operation tag.',
          },
          {
            name: 'opcode',
            description: 'NFS operation name, or main operation name, in case of COMPOUND calls.',
          },
          {
            name: 'status',
            description: 'NFS operation reply status.',
          },
        ],
      },
      {
        name: 'rpc',
        type: 'group',
        description: 'ONC RPC specific event fields.',
        fields: [
          {
            name: 'xid',
            description: 'RPC message transaction identifier.',
          },
          {
            name: 'status',
            description: 'RPC message reply status.',
          },
          {
            name: 'auth_flavor',
            description: 'RPC authentication flavor.',
          },
          {
            name: 'cred.uid',
            type: 'long',
            description: "RPC caller's user id, in case of auth-unix.",
          },
          {
            name: 'cred.gid',
            type: 'long',
            description: "RPC caller's group id, in case of auth-unix.",
          },
          {
            name: 'cred.gids',
            description: "RPC caller's secondary group ids, in case of auth-unix.",
          },
          {
            name: 'cred.stamp',
            type: 'long',
            description: 'Arbitrary ID which the caller machine may generate.',
          },
          {
            name: 'cred.machinename',
            description: "The name of the caller's machine.",
          },
          {
            name: 'call_size',
            type: 'alias',
            path: 'source.bytes',
            migration: true,
            description: 'RPC call size with argument.',
          },
          {
            name: 'reply_size',
            type: 'alias',
            path: 'destination.bytes',
            migration: true,
            description: 'RPC reply size with argument.',
          },
        ],
      },
    ],
  },
  {
    key: 'pgsql',
    title: 'PostgreSQL',
    description: 'PostgreSQL-specific event fields.',
    fields: [
      {
        name: 'pgsql',
        type: 'group',
        fields: [
          {
            name: 'error_code',
            description: 'The PostgreSQL error code.',
            type: 'long',
          },
          {
            name: 'error_message',
            description: 'The PostgreSQL error message.',
          },
          {
            name: 'error_severity',
            description: 'The PostgreSQL error severity.',
            possible_values: ['ERROR', 'FATAL', 'PANIC'],
          },
          {
            name: 'num_fields',
            description:
              'If the SELECT query if successful, this field is set to the number of fields returned.',
          },
          {
            name: 'num_rows',
            description:
              'If the SELECT query if successful, this field is set to the number of rows returned.',
          },
        ],
      },
    ],
  },
  {
    key: 'redis',
    title: 'Redis',
    description: 'Redis-specific event fields.',
    fields: [
      {
        name: 'redis',
        type: 'group',
        fields: [
          {
            name: 'return_value',
            description: 'The return value of the Redis command in a human readable format.',
          },
          {
            name: 'error',
            description:
              'If the Redis command has resulted in an error, this field contains the error message returned by the Redis server.',
          },
        ],
      },
    ],
  },
  {
    key: 'thrift',
    title: 'Thrift-RPC',
    description: 'Thrift-RPC specific event fields.',
    fields: [
      {
        name: 'thrift',
        type: 'group',
        fields: [
          {
            name: 'params',
            description:
              'The RPC method call parameters in a human readable format. If the IDL files are available, the parameters use names whenever possible. Otherwise, the IDs from the message are used.',
          },
          {
            name: 'service',
            description: 'The name of the Thrift-RPC service as defined in the IDL files.',
          },
          {
            name: 'return_value',
            description:
              'The value returned by the Thrift-RPC call. This is encoded in a human readable format.',
          },
          {
            name: 'exceptions',
            description:
              'If the call resulted in exceptions, this field contains the exceptions in a human readable format.',
          },
        ],
      },
    ],
  },
  {
    key: 'tls',
    title: 'TLS',
    description: 'TLS-specific event fields.',
    fields: [
      {
        name: 'tls',
        type: 'group',
        fields: [
          {
            name: 'version',
            type: 'keyword',
            description: 'The version of the TLS protocol used.',
            example: 'TLS 1.3',
          },
          {
            name: 'handshake_completed',
            type: 'boolean',
            description:
              'Whether the TLS negotiation has been successful and the session has transitioned to encrypted mode.',
          },
          {
            name: 'resumed',
            type: 'boolean',
            description: 'If the TLS session has been resumed from a previous session.',
          },
          {
            name: 'resumption_method',
            type: 'keyword',
            description:
              'If the session has been resumed, the underlying method used. One of "id" for TLS session ID or "ticket" for TLS ticket extension.',
          },
          {
            name: 'client_certificate_requested',
            type: 'boolean',
            description:
              'Whether the server has requested the client to authenticate itself using a client certificate.',
          },
          {
            name: 'client_hello',
            type: 'group',
            fields: [
              {
                name: 'version',
                type: 'keyword',
                description:
                  'The version of the TLS protocol by which the client wishes to communicate during this session.',
              },
              {
                name: 'supported_ciphers',
                type: 'array',
                description:
                  'List of ciphers the client is willing to use for this session. See https://www.iana.org/assignments/tls-parameters/tls-parameters.xhtml#tls-parameters-4',
              },
              {
                name: 'supported_compression_methods',
                type: 'array',
                description:
                  'The list of compression methods the client supports. See https://www.iana.org/assignments/comp-meth-ids/comp-meth-ids.xhtml',
              },
              {
                name: 'extensions',
                type: 'group',
                description: 'The hello extensions provided by the client.',
                fields: [
                  {
                    name: 'server_name_indication',
                    type: 'keyword',
                    description: 'List of hostnames',
                  },
                  {
                    name: 'application_layer_protocol_negotiation',
                    type: 'keyword',
                    description:
                      'List of application-layer protocols the client is willing to use.',
                  },
                  {
                    name: 'session_ticket',
                    type: 'keyword',
                    description:
                      'Length of the session ticket, if provided, or an empty string to advertise support for tickets.',
                  },
                  {
                    name: 'supported_versions',
                    type: 'keyword',
                    description: 'List of TLS versions that the client is willing to use.',
                  },
                  {
                    name: 'supported_groups',
                    type: 'keyword',
                    description:
                      'List of Elliptic Curve Cryptography (ECC) curve groups supported by the client.',
                  },
                  {
                    name: 'signature_algorithms',
                    type: 'keyword',
                    description:
                      'List of signature algorithms that may be use in digital signatures.',
                  },
                  {
                    name: 'ec_points_formats',
                    type: 'keyword',
                    description:
                      'List of Elliptic Curve (EC) point formats. Indicates the set of point formats that the client can parse.',
                  },
                  {
                    name: '_unparsed_',
                    type: 'keyword',
                    description: 'List of extensions that were left unparsed by Packetbeat.',
                  },
                ],
              },
            ],
          },
          {
            name: 'server_hello',
            type: 'group',
            fields: [
              {
                name: 'version',
                type: 'keyword',
                description:
                  'The version of the TLS protocol that is used for this session. It is the highest version supported by the server not exceeding the version requested in the client hello.',
              },
              {
                name: 'selected_cipher',
                type: 'keyword',
                description:
                  'The cipher suite selected by the server from the list provided by in the client hello.',
              },
              {
                name: 'selected_compression_method',
                type: 'keyword',
                description:
                  'The compression method selected by the server from the list provided in the client hello.',
              },
              {
                name: 'session_id',
                type: 'keyword',
                description:
                  'Unique number to identify the session for the corresponding connection with the client.',
              },
              {
                name: 'extensions',
                type: 'group',
                description: 'The hello extensions provided by the server.',
                fields: [
                  {
                    name: 'application_layer_protocol_negotiation',
                    type: 'array',
                    description: 'Negotiated application layer protocol',
                  },
                  {
                    name: 'session_ticket',
                    type: 'keyword',
                    description:
                      'Used to announce that a session ticket will be provided by the server. Always an empty string.',
                  },
                  {
                    name: 'supported_versions',
                    type: 'keyword',
                    description: 'Negotiated TLS version to be used.',
                  },
                  {
                    name: 'ec_points_formats',
                    type: 'keyword',
                    description:
                      'List of Elliptic Curve (EC) point formats. Indicates the set of point formats that the server can parse.',
                  },
                  {
                    name: '_unparsed_',
                    type: 'keyword',
                    description: 'List of extensions that were left unparsed by Packetbeat.',
                  },
                ],
              },
            ],
          },
          {
            name: 'client_certificate',
            type: 'group',
            description: 'Certificate provided by the client for authentication.',
            fields: [
              {
                name: 'version',
                type: 'long',
                description: 'X509 format version.',
              },
              {
                name: 'serial_number',
                type: 'keyword',
                description: "The certificate's serial number.",
              },
              {
                name: 'not_before',
                type: 'date',
                description: 'Date before which the certificate is not valid.',
              },
              {
                name: 'not_after',
                type: 'date',
                description: 'Date after which the certificate expires.',
              },
              {
                name: 'public_key_algorithm',
                type: 'keyword',
                description:
                  "The algorithm used for this certificate's public key. One of RSA, DSA or ECDSA. ",
              },
              {
                name: 'public_key_size',
                type: 'long',
                description: 'Size of the public key.',
              },
              {
                name: 'signature_algorithm',
                type: 'keyword',
                description: "The algorithm used for the certificate's signature. ",
              },
              {
                name: 'alternative_names',
                type: 'array',
                description: 'Subject Alternative Names for this certificate.',
              },
              {
                name: 'raw',
                type: 'keyword',
                description: 'The raw certificate in PEM format.',
              },
              {
                name: 'subject',
                type: 'group',
                description: 'Subject represented by this certificate.',
                fields: [
                  {
                    name: 'country',
                    type: 'keyword',
                    description: 'Country code.',
                  },
                  {
                    name: 'organization',
                    type: 'keyword',
                    description: 'Organization name.',
                  },
                  {
                    name: 'organizational_unit',
                    type: 'keyword',
                    description: 'Unit within organization.',
                  },
                  {
                    name: 'province',
                    type: 'keyword',
                    description: 'Province or region within country.',
                  },
                  {
                    name: 'common_name',
                    type: 'keyword',
                    description: 'Name or host name identified by the certificate.',
                  },
                ],
              },
              {
                name: 'issuer',
                type: 'group',
                description: 'Entity that issued and signed this certificate.',
                fields: [
                  {
                    name: 'country',
                    type: 'keyword',
                    description: 'Country code.',
                  },
                  {
                    name: 'organization',
                    type: 'keyword',
                    description: 'Organization name.',
                  },
                  {
                    name: 'organizational_unit',
                    type: 'keyword',
                    description: 'Unit within organization.',
                  },
                  {
                    name: 'province',
                    type: 'keyword',
                    description: 'Province or region within country.',
                  },
                  {
                    name: 'common_name',
                    type: 'keyword',
                    description: 'Name or host name identified by the certificate.',
                  },
                ],
              },
              {
                name: 'fingerprint',
                type: 'group',
                fields: [
                  {
                    name: 'md5',
                    type: 'keyword',
                    description: "Certificate's MD5 fingerprint.",
                  },
                  {
                    name: 'sha1',
                    type: 'keyword',
                    description: "Certificate's SHA-1 fingerprint.",
                  },
                  {
                    name: 'sha256',
                    type: 'keyword',
                    description: "Certificate's SHA-256 fingerprint.",
                  },
                ],
              },
            ],
          },
          {
            name: 'server_certificate',
            type: 'group',
            description: 'Certificate provided by the server for authentication.',
            fields: [
              {
                name: 'version',
                type: 'long',
                description: 'X509 format version.',
              },
              {
                name: 'serial_number',
                type: 'keyword',
                description: "The certificate's serial number.",
              },
              {
                name: 'not_before',
                type: 'date',
                description: 'Date before which the certificate is not valid.',
              },
              {
                name: 'not_after',
                type: 'date',
                description: 'Date after which the certificate expires.',
              },
              {
                name: 'public_key_algorithm',
                type: 'keyword',
                description:
                  "The algorithm used for this certificate's public key. One of RSA, DSA or ECDSA. ",
              },
              {
                name: 'public_key_size',
                type: 'long',
                description: 'Size of the public key.',
              },
              {
                name: 'signature_algorithm',
                type: 'keyword',
                description: "The algorithm used for the certificate's signature. ",
              },
              {
                name: 'alternative_names',
                type: 'array',
                description: 'Subject Alternative Names for this certificate.',
              },
              {
                name: 'raw',
                type: 'keyword',
                description: 'The raw certificate in PEM format.',
              },
              {
                name: 'subject',
                type: 'group',
                description: 'Subject represented by this certificate.',
                fields: [
                  {
                    name: 'country',
                    type: 'keyword',
                    description: 'Country code.',
                  },
                  {
                    name: 'organization',
                    type: 'keyword',
                    description: 'Organization name.',
                  },
                  {
                    name: 'organizational_unit',
                    type: 'keyword',
                    description: 'Unit within organization.',
                  },
                  {
                    name: 'province',
                    type: 'keyword',
                    description: 'Province or region within country.',
                  },
                  {
                    name: 'common_name',
                    type: 'keyword',
                    description: 'Name or host name identified by the certificate.',
                  },
                ],
              },
              {
                name: 'issuer',
                type: 'group',
                description: 'Entity that issued and signed this certificate.',
                fields: [
                  {
                    name: 'country',
                    type: 'keyword',
                    description: 'Country code.',
                  },
                  {
                    name: 'organization',
                    type: 'keyword',
                    description: 'Organization name.',
                  },
                  {
                    name: 'organizational_unit',
                    type: 'keyword',
                    description: 'Unit within organization.',
                  },
                  {
                    name: 'province',
                    type: 'keyword',
                    description: 'Province or region within country.',
                  },
                  {
                    name: 'common_name',
                    type: 'keyword',
                    description: 'Name or host name identified by the certificate.',
                  },
                ],
              },
              {
                name: 'fingerprint',
                type: 'group',
                fields: [
                  {
                    name: 'md5',
                    type: 'keyword',
                    description: "Certificate's MD5 fingerprint.",
                  },
                  {
                    name: 'sha1',
                    type: 'keyword',
                    description: "Certificate's SHA-1 fingerprint.",
                  },
                  {
                    name: 'sha256',
                    type: 'keyword',
                    description: "Certificate's SHA-256 fingerprint.",
                  },
                ],
              },
            ],
          },
          {
            name: 'server_certificate_chain',
            type: 'array',
            description: 'Chain of trust for the server certificate.',
          },
          {
            name: 'client_certificate_chain',
            type: 'array',
            description: 'Chain of trust for the client certificate.',
          },
          {
            name: 'alert_types',
            type: 'keyword',
            description: 'An array containing the TLS alert type for every alert received.',
          },
          {
            name: 'fingerprints',
            type: 'group',
            description: 'Fingerprints for this TLS session.',
            fields: [
              {
                name: 'ja3',
                type: 'group',
                description: 'JA3 TLS client fingerprint',
                fields: [
                  {
                    name: 'hash',
                    type: 'keyword',
                    description: 'The JA3 fingerprint hash for the client side.',
                  },
                  {
                    name: 'str',
                    type: 'keyword',
                    description: 'The JA3 string used to calculate the hash.',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
