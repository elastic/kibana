export declare const streamlangOasDefinitions: {
    readonly Condition: import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>;
    readonly StreamlangDSL: import("zod").ZodObject<{
        steps: import("zod").ZodArray<import("zod").ZodType<import("../types/streamlang").StreamlangStep, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/streamlang").StreamlangStep, unknown>>>;
    }, import("zod/v4/core").$strip>;
    readonly StreamlangStep: import("zod").ZodType<import("../types/streamlang").StreamlangStep, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/streamlang").StreamlangStep, unknown>>;
    readonly StreamlangProcessor: import("zod").ZodUnion<readonly [import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"grok">;
        from: import("zod").ZodString;
        patterns: import("zod").ZodArray<import("zod").ZodString>;
        pattern_definitions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodString>>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"dissect">;
        from: import("zod").ZodString;
        pattern: import("zod").ZodString;
        append_separator: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"date">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        formats: import("zod").ZodArray<import("zod").ZodString>;
        output_format: import("zod").ZodOptional<import("zod").ZodString>;
        timezone: import("zod").ZodOptional<import("zod").ZodString>;
        locale: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"drop_document">;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"math">;
        expression: import("zod").ZodString;
        to: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"rename">;
        from: import("zod").ZodString;
        to: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
        override: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"set">;
        to: import("zod").ZodString;
        override: import("zod").ZodOptional<import("zod").ZodBoolean>;
        value: import("zod").ZodOptional<import("zod").ZodUnknown>;
        copy_from: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"append">;
        to: import("zod").ZodString;
        value: import("zod").ZodArray<import("zod").ZodUnknown>;
        allow_duplicates: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        action: import("zod").ZodLiteral<"remove_by_prefix">;
        from: import("zod").ZodString;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"remove">;
        from: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"replace">;
        from: import("zod").ZodString;
        pattern: import("zod").ZodString;
        replacement: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"redact">;
        from: import("zod").ZodString;
        patterns: import("zod").ZodArray<import("zod").ZodString>;
        pattern_definitions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodString>>;
        prefix: import("zod").ZodOptional<import("zod").ZodString>;
        suffix: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"uppercase">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"lowercase">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"trim">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"join">;
        from: import("zod").ZodArray<import("zod").ZodString>;
        delimiter: import("zod").ZodString;
        to: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"split">;
        from: import("zod").ZodString;
        separator: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
        preserve_trailing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"sort">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        order: import("zod").ZodOptional<import("zod").ZodEnum<{
            desc: "desc";
            asc: "asc";
        }>>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"convert">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        type: import("zod").ZodEnum<{
            string: "string";
            boolean: "boolean";
            integer: "integer";
            long: "long";
            double: "double";
        }>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"concat">;
        from: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodObject<{
            type: import("zod").ZodLiteral<"field">;
            value: import("zod").ZodString;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            type: import("zod").ZodLiteral<"literal">;
            value: import("zod").ZodString;
        }, import("zod/v4/core").$strip>]>>;
        to: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodIntersection<import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"network_direction">;
        source_ip: import("zod").ZodString;
        destination_ip: import("zod").ZodString;
        target_field: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodUnion<readonly [import("zod").ZodObject<{
        internal_networks: import("zod").ZodArray<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        internal_networks_field: import("zod").ZodString;
    }, import("zod/v4/core").$strip>]>>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"json_extract">;
        field: import("zod").ZodString;
        extractions: import("zod").ZodArray<import("zod").ZodObject<{
            selector: import("zod").ZodString;
            target_field: import("zod").ZodString;
            type: import("zod").ZodOptional<import("zod").ZodEnum<{
                boolean: "boolean";
                integer: "integer";
                keyword: "keyword";
                long: "long";
                double: "double";
            }>>;
        }, import("zod/v4/core").$strip>>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"enrich">;
        policy_name: import("zod").ZodString;
        to: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
        override: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"registered_domain">;
        expression: import("zod").ZodString;
        prefix: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"manual_ingest_pipeline">;
        processors: import("zod").ZodArray<import("zod").ZodPipe<import("zod").ZodRecord<import("zod").ZodEnum<{
            remove: "remove";
            join: "join";
            sort: "sort";
            split: "split";
            trim: "trim";
            script: "script";
            circle: "circle";
            date: "date";
            bytes: "bytes";
            json: "json";
            geo_grid: "geo_grid";
            convert: "convert";
            set: "set";
            attachment: "attachment";
            enrich: "enrich";
            inference: "inference";
            fail: "fail";
            pipeline: "pipeline";
            append: "append";
            lowercase: "lowercase";
            uppercase: "uppercase";
            drop: "drop";
            cef: "cef";
            uri_parts: "uri_parts";
            user_agent: "user_agent";
            registered_domain: "registered_domain";
            rename: "rename";
            csv: "csv";
            fingerprint: "fingerprint";
            community_id: "community_id";
            date_index_name: "date_index_name";
            dissect: "dissect";
            dot_expander: "dot_expander";
            foreach: "foreach";
            ip_location: "ip_location";
            geoip: "geoip";
            grok: "grok";
            gsub: "gsub";
            html_strip: "html_strip";
            kv: "kv";
            network_direction: "network_direction";
            redact: "redact";
            reroute: "reroute";
            set_security_user: "set_security_user";
            terminate: "terminate";
            urldecode: "urldecode";
        }>, import("zod").ZodUnknown>, import("zod").ZodTransform<{
            [k: string]: unknown;
        }, Record<"remove" | "join" | "sort" | "split" | "trim" | "script" | "circle" | "date" | "bytes" | "json" | "geo_grid" | "convert" | "set" | "attachment" | "enrich" | "inference" | "fail" | "pipeline" | "append" | "lowercase" | "uppercase" | "drop" | "cef" | "uri_parts" | "user_agent" | "registered_domain" | "rename" | "csv" | "fingerprint" | "community_id" | "date_index_name" | "dissect" | "dot_expander" | "foreach" | "ip_location" | "geoip" | "grok" | "gsub" | "html_strip" | "kv" | "network_direction" | "redact" | "reroute" | "set_security_user" | "terminate" | "urldecode", unknown>>>>;
        tag: import("zod").ZodOptional<import("zod").ZodString>;
        on_failure: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
    }, import("zod/v4/core").$strip>]>;
    readonly GrokProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"grok">;
        from: import("zod").ZodString;
        patterns: import("zod").ZodArray<import("zod").ZodString>;
        pattern_definitions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodString>>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly DissectProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"dissect">;
        from: import("zod").ZodString;
        pattern: import("zod").ZodString;
        append_separator: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly DateProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"date">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        formats: import("zod").ZodArray<import("zod").ZodString>;
        output_format: import("zod").ZodOptional<import("zod").ZodString>;
        timezone: import("zod").ZodOptional<import("zod").ZodString>;
        locale: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>;
    readonly RenameProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"rename">;
        from: import("zod").ZodString;
        to: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
        override: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly AppendProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"append">;
        to: import("zod").ZodString;
        value: import("zod").ZodArray<import("zod").ZodUnknown>;
        allow_duplicates: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly ConvertProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"convert">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        type: import("zod").ZodEnum<{
            string: "string";
            boolean: "boolean";
            integer: "integer";
            long: "long";
            double: "double";
        }>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly RemoveByPrefixProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        action: import("zod").ZodLiteral<"remove_by_prefix">;
        from: import("zod").ZodString;
    }, import("zod/v4/core").$strip>;
    readonly RemoveProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"remove">;
        from: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly DropDocumentProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"drop_document">;
    }, import("zod/v4/core").$strip>;
    readonly ReplaceProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"replace">;
        from: import("zod").ZodString;
        pattern: import("zod").ZodString;
        replacement: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly RedactProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"redact">;
        from: import("zod").ZodString;
        patterns: import("zod").ZodArray<import("zod").ZodString>;
        pattern_definitions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodString>>;
        prefix: import("zod").ZodOptional<import("zod").ZodString>;
        suffix: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly MathProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"math">;
        expression: import("zod").ZodString;
        to: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly UppercaseProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"uppercase">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly LowercaseProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"lowercase">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly TrimProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"trim">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly JoinProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"join">;
        from: import("zod").ZodArray<import("zod").ZodString>;
        delimiter: import("zod").ZodString;
        to: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly SplitProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"split">;
        from: import("zod").ZodString;
        separator: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
        preserve_trailing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly SortProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"sort">;
        from: import("zod").ZodString;
        to: import("zod").ZodOptional<import("zod").ZodString>;
        order: import("zod").ZodOptional<import("zod").ZodEnum<{
            desc: "desc";
            asc: "asc";
        }>>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly ConcatProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"concat">;
        from: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodObject<{
            type: import("zod").ZodLiteral<"field">;
            value: import("zod").ZodString;
        }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
            type: import("zod").ZodLiteral<"literal">;
            value: import("zod").ZodString;
        }, import("zod/v4/core").$strip>]>>;
        to: import("zod").ZodString;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>;
    readonly NetworkDirectionProcessor: import("zod").ZodIntersection<import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"network_direction">;
        source_ip: import("zod").ZodString;
        destination_ip: import("zod").ZodString;
        target_field: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
    }, import("zod/v4/core").$strip>, import("zod").ZodUnion<readonly [import("zod").ZodObject<{
        internal_networks: import("zod").ZodArray<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
        internal_networks_field: import("zod").ZodString;
    }, import("zod/v4/core").$strip>]>>;
    readonly ManualIngestPipelineProcessor: import("zod").ZodObject<{
        customIdentifier: import("zod").ZodOptional<import("zod").ZodString>;
        description: import("zod").ZodOptional<import("zod").ZodString>;
        ignore_failure: import("zod").ZodOptional<import("zod").ZodBoolean>;
        where: import("zod").ZodOptional<import("zod").ZodType<import("../types/conditions").Condition, unknown, import("zod/v4/core").$ZodTypeInternals<import("../types/conditions").Condition, unknown>>>;
        action: import("zod").ZodLiteral<"manual_ingest_pipeline">;
        processors: import("zod").ZodArray<import("zod").ZodPipe<import("zod").ZodRecord<import("zod").ZodEnum<{
            remove: "remove";
            join: "join";
            sort: "sort";
            split: "split";
            trim: "trim";
            script: "script";
            circle: "circle";
            date: "date";
            bytes: "bytes";
            json: "json";
            geo_grid: "geo_grid";
            convert: "convert";
            set: "set";
            attachment: "attachment";
            enrich: "enrich";
            inference: "inference";
            fail: "fail";
            pipeline: "pipeline";
            append: "append";
            lowercase: "lowercase";
            uppercase: "uppercase";
            drop: "drop";
            cef: "cef";
            uri_parts: "uri_parts";
            user_agent: "user_agent";
            registered_domain: "registered_domain";
            rename: "rename";
            csv: "csv";
            fingerprint: "fingerprint";
            community_id: "community_id";
            date_index_name: "date_index_name";
            dissect: "dissect";
            dot_expander: "dot_expander";
            foreach: "foreach";
            ip_location: "ip_location";
            geoip: "geoip";
            grok: "grok";
            gsub: "gsub";
            html_strip: "html_strip";
            kv: "kv";
            network_direction: "network_direction";
            redact: "redact";
            reroute: "reroute";
            set_security_user: "set_security_user";
            terminate: "terminate";
            urldecode: "urldecode";
        }>, import("zod").ZodUnknown>, import("zod").ZodTransform<{
            [k: string]: unknown;
        }, Record<"remove" | "join" | "sort" | "split" | "trim" | "script" | "circle" | "date" | "bytes" | "json" | "geo_grid" | "convert" | "set" | "attachment" | "enrich" | "inference" | "fail" | "pipeline" | "append" | "lowercase" | "uppercase" | "drop" | "cef" | "uri_parts" | "user_agent" | "registered_domain" | "rename" | "csv" | "fingerprint" | "community_id" | "date_index_name" | "dissect" | "dot_expander" | "foreach" | "ip_location" | "geoip" | "grok" | "gsub" | "html_strip" | "kv" | "network_direction" | "redact" | "reroute" | "set_security_user" | "terminate" | "urldecode", unknown>>>>;
        tag: import("zod").ZodOptional<import("zod").ZodString>;
        on_failure: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>>>;
    }, import("zod/v4/core").$strip>;
};
export type StreamlangOasDefinitions = typeof streamlangOasDefinitions;
