import type { GrokExtractionPayload, GrokExtractionResult, DissectExtractionPayload, DissectExtractionResult } from './types';
export declare function executeTask(payload: GrokExtractionPayload): GrokExtractionResult;
export declare function executeTask(payload: DissectExtractionPayload): DissectExtractionResult;
export declare function executeTask(payload: GrokExtractionPayload | DissectExtractionPayload): GrokExtractionResult | DissectExtractionResult;
export default executeTask;
