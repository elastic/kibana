import type { StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { ConfigDrivenProcessorFormState, FieldConfiguration, FieldOptions } from './types';
export declare const getConvertFormStateToConfig: <FormState extends ConfigDrivenProcessorFormState, ProcessorState extends StreamlangProcessorDefinition>(fieldConfigurations: FieldConfiguration[], fieldOptions: FieldOptions) => ((formState: FormState) => ProcessorState);
export declare const getConvertProcessorToFormState: <ProcessorState, FormState>(defaultFormState: FormState) => ((processorState: ProcessorState) => FormState);
