import { Streams } from '../models/streams';
export declare const isRootStreamDefinition: <TValue extends Streams.all.Definition>(value: TValue) => value is Extract<TValue, Streams.WiredStream.Definition>;
