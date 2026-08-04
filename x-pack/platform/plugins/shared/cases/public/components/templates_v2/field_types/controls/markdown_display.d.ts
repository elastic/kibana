import type { z } from '@kbn/zod/v4';
import React from 'react';
import type { MarkdownFieldSchema } from '../../../../../common/types/domain/template/fields';
type MarkdownDisplayProps = z.infer<typeof MarkdownFieldSchema>;
/**
 * Renders authored markdown as formatted, read-only text (e.g. instructions on a case). This is a
 * display-only field: it takes no user input and stores no value in `extended_fields`.
 */
export declare const MarkdownDisplay: {
    ({ name, metadata }: MarkdownDisplayProps): React.JSX.Element;
    displayName: string;
};
export {};
