import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ReadOperations, WriteOperations, AlertingAuthorization } from '@kbn/alerting-plugin/server';
export declare function getAuthzFilter(authorization: PublicMethodsOf<AlertingAuthorization>, operation: WriteOperations.Update | ReadOperations.Get | ReadOperations.Find): Promise<import("@kbn/es-query").KueryNode | import("@kbn/utility-types").JsonObject | undefined>;
