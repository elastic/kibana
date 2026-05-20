import { Streams } from '@kbn/streams-schema';
import type { StateDependencies } from '../types';
import type { StreamActiveRecord } from './stream_active_record';
export declare function streamFromDefinition(definition: Streams.all.Definition, dependencies: StateDependencies): StreamActiveRecord;
