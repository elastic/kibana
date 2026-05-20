import React from 'react';
import type { ArrayItem, ValidationFunc } from '../../../../../../shared_imports';
interface Props {
    label: string;
    helpText: React.ReactNode;
    error: string | null;
    value: ArrayItem[];
    onAdd: () => void;
    onRemove: (id: number) => void;
    addLabel: string;
    /**
     * Validation to be applied to every text item
     */
    textValidations?: Array<ValidationFunc<any, string, string>>;
    /**
     * Serializer to be applied to every text item
     */
    textSerializer?: <O = string>(v: string) => O;
    /**
     * Deserializer to be applied to every text item
     */
    textDeserializer?: (v: unknown) => string;
}
export declare function InputList({ label, helpText, error, value, onAdd, onRemove, addLabel, textValidations, textDeserializer, textSerializer, }: Props): JSX.Element;
export {};
