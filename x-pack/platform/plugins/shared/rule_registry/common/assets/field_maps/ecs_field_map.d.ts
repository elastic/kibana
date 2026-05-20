export declare const ecsFieldMap: {
    readonly '@timestamp': {
        readonly type: "date";
        readonly array: false;
        readonly required: true;
    };
    readonly 'agent.build.original': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'agent.ephemeral_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'agent.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'agent.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'agent.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'agent.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.address': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.as.number': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.as.organization.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.city_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.continent_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.continent_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.country_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.country_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.location': {
        readonly type: "geo_point";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.postal_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.region_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.region_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.geo.timezone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.mac': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.nat.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.nat.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.packets': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.registered_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.subdomain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.top_level_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.email': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.full_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.group.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.hash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'client.user.roles': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'cloud.account.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.account.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.availability_zone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.instance.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.instance.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.machine.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.account.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.account.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.availability_zone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.instance.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.instance.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.machine.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.project.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.project.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.provider': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.region': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.origin.service.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.project.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.project.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.provider': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.region': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.service.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.account.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.account.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.availability_zone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.instance.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.instance.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.machine.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.project.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.project.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.provider': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.region': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'cloud.target.service.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'container.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'container.image.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'container.image.tag': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'container.labels': {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    readonly 'container.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'container.runtime': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.address': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.as.number': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.as.organization.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.city_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.continent_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.continent_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.country_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.country_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.location': {
        readonly type: "geo_point";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.postal_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.region_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.region_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.geo.timezone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.mac': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.nat.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.nat.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.packets': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.registered_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.subdomain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.top_level_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.email': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.full_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.group.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.hash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'destination.user.roles': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'dll.code_signature.digest_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.code_signature.exists': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.code_signature.signing_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.code_signature.status': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.code_signature.subject_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.code_signature.team_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.code_signature.timestamp': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.code_signature.trusted': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.code_signature.valid': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.hash.md5': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.hash.sha1': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.hash.sha256': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.hash.sha512': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.hash.ssdeep': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.pe.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.pe.company': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.pe.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.pe.file_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.pe.imphash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.pe.original_file_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dll.pe.product': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.answers': {
        readonly type: "object";
        readonly array: true;
        readonly required: false;
    };
    readonly 'dns.answers.class': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.answers.data': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.answers.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.answers.ttl': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.answers.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.header_flags': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'dns.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.op_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.question.class': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.question.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.question.registered_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.question.subdomain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.question.top_level_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.question.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.resolved_ip': {
        readonly type: "ip";
        readonly array: true;
        readonly required: false;
    };
    readonly 'dns.response_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'dns.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'ecs.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: true;
    };
    readonly 'error.code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'error.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'error.message': {
        readonly type: "match_only_text";
        readonly array: false;
        readonly required: false;
    };
    readonly 'error.stack_trace': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'error.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.action': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.agent_id_status': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.category': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'event.code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.created': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.dataset': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.duration': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.end': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.hash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.ingested': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.kind': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.module': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.original': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.outcome': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.provider': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.reason': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.reference': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.risk_score': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.risk_score_norm': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.sequence': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.severity': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.start': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.timezone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'event.type': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'event.url': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'faas.coldstart': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'faas.execution': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'faas.trigger': {
        readonly type: "nested";
        readonly array: false;
        readonly required: false;
    };
    readonly 'faas.trigger.request_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'faas.trigger.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.accessed': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.attributes': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.code_signature.digest_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.code_signature.exists': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.code_signature.signing_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.code_signature.status': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.code_signature.subject_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.code_signature.team_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.code_signature.timestamp': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.code_signature.trusted': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.code_signature.valid': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.created': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.ctime': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.device': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.directory': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.drive_letter': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.byte_order': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.cpu_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.creation_date': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.exports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.elf.header.abi_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.header.class': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.header.data': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.header.entrypoint': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.header.object_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.header.os_abi': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.header.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.header.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.imports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.elf.sections': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.elf.sections.chi2': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.sections.entropy': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.sections.flags': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.sections.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.sections.physical_offset': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.sections.physical_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.sections.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.sections.virtual_address': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.sections.virtual_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.segments': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.elf.segments.sections': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.segments.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.elf.shared_libraries': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.elf.telfhash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.extension': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.fork_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.gid': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.group': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.hash.md5': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.hash.sha1': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.hash.sha256': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.hash.sha512': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.hash.ssdeep': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.inode': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.mime_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.mode': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.mtime': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.owner': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.pe.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.pe.company': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.pe.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.pe.file_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.pe.imphash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.pe.original_file_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.pe.product': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.target_path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.uid': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.alternative_names': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.issuer.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.issuer.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.issuer.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.issuer.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.issuer.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.issuer.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.issuer.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.not_after': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.not_before': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.public_key_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.public_key_curve': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.public_key_exponent': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.public_key_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.serial_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.signature_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.subject.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.subject.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.subject.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'file.x509.subject.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.subject.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.subject.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.subject.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'file.x509.version_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'group.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.boot.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.cpu.usage': {
        readonly type: "scaled_float";
        readonly array: false;
        readonly required: false;
        readonly scaling_factor: 1000;
    };
    readonly 'host.disk.read.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.disk.write.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.city_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.continent_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.continent_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.country_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.country_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.location': {
        readonly type: "geo_point";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.postal_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.region_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.region_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.geo.timezone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.hostname': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.ip': {
        readonly type: "ip";
        readonly array: true;
        readonly required: false;
    };
    readonly 'host.mac': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'host.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.network.egress.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.network.egress.packets': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.network.ingress.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.network.ingress.packets': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.os.family': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.os.full': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.os.kernel': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.os.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.os.platform': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.os.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.os.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.pid_ns_ino': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.risk.calculated_level': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.risk.calculated_score': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.risk.calculated_score_norm': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.risk.static_level': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.risk.static_score': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.risk.static_score_norm': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'host.uptime': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.request.body.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.request.body.content': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.request.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.request.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.request.method': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.request.mime_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.request.referrer': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.response.body.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.response.body.content': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.response.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.response.mime_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.response.status_code': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'http.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly labels: {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.file.path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.level': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.logger': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.origin.file.line': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.origin.file.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.origin.function': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.syslog': {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.syslog.facility.code': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.syslog.facility.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.syslog.priority': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.syslog.severity.code': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'log.syslog.severity.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly message: {
        readonly type: "match_only_text";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.application': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.community_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.direction': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.forwarded_ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.iana_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.inner': {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.inner.vlan.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.inner.vlan.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.packets': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.protocol': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.transport': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.vlan.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'network.vlan.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.egress': {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.egress.interface.alias': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.egress.interface.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.egress.interface.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.egress.vlan.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.egress.vlan.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.egress.zone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.city_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.continent_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.continent_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.country_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.country_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.location': {
        readonly type: "geo_point";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.postal_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.region_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.region_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.geo.timezone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.hostname': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.ingress': {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.ingress.interface.alias': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.ingress.interface.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.ingress.interface.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.ingress.vlan.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.ingress.vlan.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.ingress.zone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.ip': {
        readonly type: "ip";
        readonly array: true;
        readonly required: false;
    };
    readonly 'observer.mac': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'observer.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.os.family': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.os.full': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.os.kernel': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.os.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.os.platform': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.os.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.os.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.product': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.serial_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.vendor': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'observer.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.api_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.cluster.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.cluster.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.cluster.url': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.cluster.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.namespace': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.organization': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.resource.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.resource.ip': {
        readonly type: "ip";
        readonly array: true;
        readonly required: false;
    };
    readonly 'orchestrator.resource.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.resource.parent.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.resource.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'orchestrator.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'organization.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'organization.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.build_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.checksum': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.install_scope': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.installed': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.license': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.reference': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'package.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.args': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.args_count': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.code_signature.digest_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.code_signature.exists': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.code_signature.signing_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.code_signature.status': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.code_signature.subject_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.code_signature.team_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.code_signature.timestamp': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.code_signature.trusted': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.code_signature.valid': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.command_line': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.byte_order': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.cpu_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.creation_date': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.exports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.elf.header.abi_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.header.class': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.header.data': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.header.entrypoint': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.header.object_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.header.os_abi': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.header.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.header.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.imports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.elf.sections': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.elf.sections.chi2': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.sections.entropy': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.sections.flags': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.sections.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.sections.physical_offset': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.sections.physical_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.sections.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.sections.virtual_address': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.sections.virtual_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.segments': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.elf.segments.sections': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.segments.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.elf.shared_libraries': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.elf.telfhash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.end': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.entity_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.entry_leader.entity_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.executable': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.exit_code': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.hash.md5': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.hash.sha1': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.hash.sha256': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.hash.sha512': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.hash.ssdeep': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.args': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.parent.args_count': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.code_signature.digest_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.code_signature.exists': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.code_signature.signing_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.code_signature.status': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.code_signature.subject_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.code_signature.team_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.code_signature.timestamp': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.code_signature.trusted': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.code_signature.valid': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.command_line': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.byte_order': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.cpu_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.creation_date': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.exports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.parent.elf.header.abi_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.header.class': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.header.data': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.header.entrypoint': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.header.object_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.header.os_abi': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.header.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.header.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.imports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections.chi2': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections.entropy': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections.flags': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections.physical_offset': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections.physical_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections.virtual_address': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.sections.virtual_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.segments': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.parent.elf.segments.sections': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.segments.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.elf.shared_libraries': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'process.parent.elf.telfhash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.end': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.entity_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.executable': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.exit_code': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.hash.md5': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.hash.sha1': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.hash.sha256': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.hash.sha512': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.hash.ssdeep': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.pe.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.pe.company': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.pe.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.pe.file_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.pe.imphash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.pe.original_file_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.pe.product': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.pgid': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.pid': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.start': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.thread.id': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.thread.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.title': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.uptime': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.parent.working_directory': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.pe.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.pe.company': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.pe.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.pe.file_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.pe.imphash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.pe.original_file_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.pe.product': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.pgid': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.pid': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.session_leader.entity_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.start': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.thread.id': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.thread.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.title': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.uptime': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'process.working_directory': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'registry.data.bytes': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'registry.data.strings': {
        readonly type: "wildcard";
        readonly array: true;
        readonly required: false;
    };
    readonly 'registry.data.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'registry.hive': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'registry.key': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'registry.path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'registry.value': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'related.hash': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'related.hosts': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'related.ip': {
        readonly type: "ip";
        readonly array: true;
        readonly required: false;
    };
    readonly 'related.user': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'rule.author': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'rule.category': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'rule.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'rule.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'rule.license': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'rule.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'rule.reference': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'rule.ruleset': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'rule.uuid': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'rule.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.address': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.as.number': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.as.organization.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.city_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.continent_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.continent_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.country_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.country_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.location': {
        readonly type: "geo_point";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.postal_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.region_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.region_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.geo.timezone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.mac': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.nat.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.nat.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.packets': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.registered_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.subdomain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.top_level_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.email': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.full_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.group.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.hash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'server.user.roles': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'service.address': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.environment': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.ephemeral_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.node.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.origin.address': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.origin.environment': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.origin.ephemeral_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.origin.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.origin.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.origin.node.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.origin.state': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.origin.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.origin.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.state': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.target.address': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.target.environment': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.target.ephemeral_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.target.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.target.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.target.node.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.target.state': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.target.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.target.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'service.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.address': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.as.number': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.as.organization.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.bytes': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.city_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.continent_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.continent_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.country_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.country_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.location': {
        readonly type: "geo_point";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.postal_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.region_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.region_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.geo.timezone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.mac': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.nat.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.nat.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.packets': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.registered_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.subdomain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.top_level_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.email': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.full_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.group.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.hash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'source.user.roles': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'span.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly tags: {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator': {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.as.number': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.as.organization.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.confidence': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.email.address': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.accessed': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.attributes': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.code_signature.digest_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.code_signature.exists': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.code_signature.signing_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.code_signature.status': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.code_signature.subject_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.code_signature.team_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.code_signature.timestamp': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.code_signature.trusted': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.code_signature.valid': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.created': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.ctime': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.device': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.directory': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.drive_letter': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.byte_order': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.cpu_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.creation_date': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.exports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.header.abi_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.header.class': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.header.data': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.header.entrypoint': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.header.object_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.header.os_abi': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.header.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.header.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.imports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections.chi2': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections.entropy': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections.flags': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections.physical_offset': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections.physical_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections.virtual_address': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.sections.virtual_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.segments': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.segments.sections': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.segments.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.shared_libraries': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.elf.telfhash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.extension': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.fork_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.gid': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.group': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.hash.md5': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.hash.sha1': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.hash.sha256': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.hash.sha512': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.hash.ssdeep': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.inode': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.mime_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.mode': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.mtime': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.owner': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.pe.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.pe.company': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.pe.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.pe.file_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.pe.imphash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.pe.original_file_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.pe.product': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.target_path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.uid': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.alternative_names': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.issuer.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.issuer.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.issuer.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.issuer.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.issuer.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.issuer.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.issuer.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.not_after': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.not_before': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.public_key_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.public_key_curve': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.public_key_exponent': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.public_key_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.serial_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.signature_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.subject.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.subject.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.subject.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.subject.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.subject.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.subject.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.subject.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.file.x509.version_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.first_seen': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.city_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.continent_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.continent_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.country_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.country_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.location': {
        readonly type: "geo_point";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.postal_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.region_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.region_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.geo.timezone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.last_seen': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.marking.tlp': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.modified_at': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.provider': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.reference': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.registry.data.bytes': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.registry.data.strings': {
        readonly type: "wildcard";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.registry.data.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.registry.hive': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.registry.key': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.registry.path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.registry.value': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.scanner_stats': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.sightings': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.extension': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.fragment': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.full': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.original': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.password': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.path': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.query': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.registered_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.scheme': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.subdomain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.top_level_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.url.username': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.alternative_names': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.issuer.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.issuer.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.issuer.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.issuer.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.issuer.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.issuer.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.issuer.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.not_after': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.not_before': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.public_key_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.public_key_curve': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.public_key_exponent': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.public_key_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.serial_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.signature_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.subject.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.subject.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.subject.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.subject.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.subject.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.subject.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.subject.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.enrichments.indicator.x509.version_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.matched.atomic': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.matched.field': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.matched.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.matched.index': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.enrichments.matched.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.framework': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.group.alias': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.group.reference': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.as.number': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.as.organization.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.confidence': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.email.address': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.accessed': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.attributes': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.code_signature.digest_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.code_signature.exists': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.code_signature.signing_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.code_signature.status': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.code_signature.subject_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.code_signature.team_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.code_signature.timestamp': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.code_signature.trusted': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.code_signature.valid': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.created': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.ctime': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.device': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.directory': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.drive_letter': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.byte_order': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.cpu_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.creation_date': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.exports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.header.abi_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.header.class': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.header.data': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.header.entrypoint': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.header.object_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.header.os_abi': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.header.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.header.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.imports': {
        readonly type: "flattened";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections.chi2': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections.entropy': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections.flags': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections.physical_offset': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections.physical_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections.virtual_address': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.sections.virtual_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.segments': {
        readonly type: "nested";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.segments.sections': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.segments.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.shared_libraries': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.elf.telfhash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.extension': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.fork_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.gid': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.group': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.hash.md5': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.hash.sha1': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.hash.sha256': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.hash.sha512': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.hash.ssdeep': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.inode': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.mime_type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.mode': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.mtime': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.owner': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.pe.architecture': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.pe.company': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.pe.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.pe.file_version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.pe.imphash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.pe.original_file_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.pe.product': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.target_path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.uid': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.alternative_names': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.issuer.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.issuer.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.issuer.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.issuer.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.issuer.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.issuer.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.issuer.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.not_after': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.not_before': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.public_key_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.public_key_curve': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.public_key_exponent': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.public_key_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.serial_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.signature_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.subject.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.subject.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.subject.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.subject.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.subject.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.subject.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.subject.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.file.x509.version_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.first_seen': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.city_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.continent_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.continent_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.country_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.country_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.location': {
        readonly type: "geo_point";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.postal_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.region_iso_code': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.region_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.geo.timezone': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.ip': {
        readonly type: "ip";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.last_seen': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.marking.tlp': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.modified_at': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.provider': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.reference': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.registry.data.bytes': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.registry.data.strings': {
        readonly type: "wildcard";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.registry.data.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.registry.hive': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.registry.key': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.registry.path': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.registry.value': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.scanner_stats': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.sightings': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.extension': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.fragment': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.full': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.original': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.password': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.path': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.query': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.registered_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.scheme': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.subdomain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.top_level_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.url.username': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.alternative_names': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.issuer.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.issuer.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.issuer.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.issuer.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.issuer.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.issuer.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.issuer.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.not_after': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.not_before': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.public_key_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.public_key_curve': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.public_key_exponent': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.public_key_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.serial_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.signature_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.subject.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.subject.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.subject.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.subject.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.subject.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.subject.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.subject.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.indicator.x509.version_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.software.alias': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.software.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.software.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.software.platforms': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.software.reference': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.software.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'threat.tactic.id': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.tactic.name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.tactic.reference': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.technique.id': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.technique.name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.technique.reference': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.technique.subtechnique.id': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.technique.subtechnique.name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'threat.technique.subtechnique.reference': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.cipher': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.certificate': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.certificate_chain': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.hash.md5': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.hash.sha1': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.hash.sha256': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.issuer': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.ja3': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.not_after': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.not_before': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.server_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.subject': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.supported_ciphers': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.alternative_names': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.issuer.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.issuer.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.issuer.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.issuer.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.issuer.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.issuer.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.issuer.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.not_after': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.not_before': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.public_key_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.public_key_curve': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.public_key_exponent': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.public_key_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.serial_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.signature_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.subject.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.subject.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.subject.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.client.x509.subject.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.subject.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.subject.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.subject.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.client.x509.version_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.curve': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.established': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.next_protocol': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.resumed': {
        readonly type: "boolean";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.certificate': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.certificate_chain': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.hash.md5': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.hash.sha1': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.hash.sha256': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.issuer': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.ja3s': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.not_after': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.not_before': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.subject': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.alternative_names': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.issuer.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.issuer.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.issuer.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.issuer.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.issuer.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.issuer.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.issuer.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.not_after': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.not_before': {
        readonly type: "date";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.public_key_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.public_key_curve': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.public_key_exponent': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.public_key_size': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.serial_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.signature_algorithm': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.subject.common_name': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.subject.country': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.subject.distinguished_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.server.x509.subject.locality': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.subject.organization': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.subject.organizational_unit': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.subject.state_or_province': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'tls.server.x509.version_number': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'tls.version_protocol': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'trace.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'transaction.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.extension': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.fragment': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.full': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.original': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.password': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.path': {
        readonly type: "wildcard";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.port': {
        readonly type: "long";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.query': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.registered_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.scheme': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.subdomain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.top_level_domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'url.username': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.email': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.full_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.group.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.hash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.changes.roles': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'user.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.email': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.full_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.group.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.hash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.effective.roles': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'user.email': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.full_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.group.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.hash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.risk.calculated_level': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.risk.calculated_score': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.risk.calculated_score_norm': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.risk.static_level': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.risk.static_score': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.risk.static_score_norm': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.roles': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'user.target.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.target.email': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.target.full_name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.target.group.domain': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.target.group.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.target.group.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.target.hash': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.target.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.target.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user.target.roles': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'user_agent.device.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.original': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.os.family': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.os.full': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.os.kernel': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.os.name': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.os.platform': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.os.type': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.os.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'user_agent.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.category': {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    readonly 'vulnerability.classification': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.description': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.enumeration': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.reference': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.report_id': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.scanner.vendor': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.score.base': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.score.environmental': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.score.temporal': {
        readonly type: "float";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.score.version': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
    readonly 'vulnerability.severity': {
        readonly type: "keyword";
        readonly array: false;
        readonly required: false;
    };
};
export type EcsFieldMap = typeof ecsFieldMap;
