import type { IngestPipelineFlyoutProps } from '../../../types';
import type { AppServices, CoreServices } from '../..';
export interface IngestPipelineFlyoutWithContextProps extends IngestPipelineFlyoutProps {
    services: AppServices;
    coreServices: CoreServices;
}
