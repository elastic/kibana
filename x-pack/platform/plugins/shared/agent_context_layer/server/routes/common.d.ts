import type { RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SmlHttpItem } from '../../common/http_api/sml';
import type { SmlDocument } from '../services/sml/types';
export declare const toSmlHttpItem: (doc: SmlDocument) => SmlHttpItem;
export declare const READ_SECURITY: RouteSecurity;
export declare const WRITE_SECURITY: RouteSecurity;
export declare const withSmlFeatureFlag: <P, Q, B>(handler: RequestHandler<P, Q, B>) => RequestHandler<P, Q, B>;
