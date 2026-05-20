import type { Pipeline } from '../../../../common/types';
export type ReadProcessorsFunction = () => Pick<Pipeline, 'processors' | 'on_failure'>;
export type PipelineForm = Omit<Pipeline, 'processors' | 'on_failure'>;
