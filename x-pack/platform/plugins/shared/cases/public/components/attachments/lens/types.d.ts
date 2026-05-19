import type { TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
export type LensProps = Pick<TypedLensByValueInput, 'attributes'> & {
    /**
     * Optional metadata used to customize the Lens Attachment rendering.
     */
    metadata?: {
        description?: string;
    };
    timeRange?: TimeRange;
};
