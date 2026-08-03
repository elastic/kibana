import type { FC } from 'react';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
interface Props {
    mappings: MappingTypeMapping;
    setMappings?: (mappings: string) => void;
    readonly?: boolean;
    showTitle?: boolean;
    fileCount?: number;
    showBorder?: boolean;
}
export declare const Mappings: FC<Props>;
export {};
