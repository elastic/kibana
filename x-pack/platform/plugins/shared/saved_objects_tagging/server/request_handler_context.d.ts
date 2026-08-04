import type { CoreRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { ITagsClient } from '../common/types';
import type { ITagsRequestHandlerContext } from './types';
import { type IAssignmentService } from './services';
export declare class TagsRequestHandlerContext implements ITagsRequestHandlerContext {
    #private;
    private readonly request;
    private readonly coreContext;
    private readonly security?;
    constructor(request: KibanaRequest, coreContext: CoreRequestHandlerContext, security?: SecurityPluginSetup | undefined);
    get tagsClient(): ITagsClient;
    get assignmentService(): IAssignmentService;
}
