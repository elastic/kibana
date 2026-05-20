import type { Boom } from '@hapi/boom';
import type { CustomHttpResponseOptions, ResponseError, Headers, Logger } from '@kbn/core/server';
import type { CaseError, HTTPError } from '../../common/error';
/**
 * Transforms an error into the correct format for a kibana response.
 */
export declare function wrapError(error: CaseError | Boom | HTTPError | Error): CustomHttpResponseOptions<ResponseError>;
export declare const escapeHatch: import("@kbn/config-schema").ObjectType<{}>;
/**
 * Creates a warning header with a message formatted according to RFC7234.
 * We follow the same formatting as Elasticsearch
 * https://github.com/elastic/elasticsearch/blob/5baabff6670a8ed49297488ca8cac8ec12a2078d/server/src/main/java/org/elasticsearch/common/logging/HeaderWarning.java#L55
 */
export declare const getWarningHeader: (kibanaVersion: string, msg?: string | undefined) => {
    warning: string;
};
/**
 * Taken from
 * https://github.com/elastic/kibana/blob/ec30f2aeeb10fb64b507935e558832d3ef5abfaa/x-pack/plugins/spaces/server/usage_stats/usage_stats_client.ts#L113-L118
 */
export declare const getIsKibanaRequest: (headers?: Headers) => boolean;
export declare const logDeprecatedEndpoint: (logger: Logger, headers: Headers, msg: string) => void;
/**
 * Extracts the warning value a warning header that is formatted according to RFC 7234.
 * For example for the string 299 Kibana-8.1.0 "Deprecation endpoint", the return value is Deprecation endpoint.
 *
 */
export declare const extractWarningValueFromWarningHeader: (warningHeader: string) => string;
