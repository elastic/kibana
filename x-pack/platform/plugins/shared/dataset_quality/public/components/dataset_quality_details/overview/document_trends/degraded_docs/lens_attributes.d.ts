import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
interface GetLensAttributesParams {
    color: string;
    dataStream: string;
    datasetTitle: string;
    breakdownFieldName?: string;
}
export declare function getLensAttributes({ color, dataStream, datasetTitle, breakdownFieldName, }: GetLensAttributesParams): TypedLensByValueInput["attributes"];
export {};
