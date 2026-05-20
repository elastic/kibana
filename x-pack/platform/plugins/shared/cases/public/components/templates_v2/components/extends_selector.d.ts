import React from 'react';
interface ExtendsSelectorProps {
    yamlValue: string;
    onYamlChange: (value: string) => void;
    currentTemplateId?: string;
}
export declare const ExtendsSelector: React.FC<ExtendsSelectorProps>;
export {};
