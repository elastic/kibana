import type { IBasePath, KibanaRequest } from '@kbn/core/server';
import type { IBasePath as BasePathAccessor } from '../../common/utils';
export declare const getRequestBasePath: (request: KibanaRequest, basePath: IBasePath) => BasePathAccessor;
