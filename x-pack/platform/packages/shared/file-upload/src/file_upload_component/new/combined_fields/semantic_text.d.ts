import type { FC } from 'react';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { AddCombinedField } from './combined_fields_form';
interface Props {
    addCombinedField: AddCombinedField;
    hasNameCollision: (name: string) => boolean;
    mappings: MappingTypeMapping;
}
export declare const SemanticTextForm: FC<Props>;
export {};
