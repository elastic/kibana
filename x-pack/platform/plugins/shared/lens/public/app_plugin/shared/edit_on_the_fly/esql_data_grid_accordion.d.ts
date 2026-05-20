import React from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLDataGridAttrs } from './helpers';
interface ESQLDataGridAccordionProps {
    isAccordionOpen: boolean;
    dataGridAttrs: ESQLDataGridAttrs;
    query: AggregateQuery;
    isTableView: boolean;
    setIsAccordionOpen: (flag: boolean) => void;
    onAccordionToggleCb: (status: boolean) => void;
}
export declare const ESQLDataGridAccordion: ({ isAccordionOpen, dataGridAttrs, query, isTableView, setIsAccordionOpen, onAccordionToggleCb, }: ESQLDataGridAccordionProps) => React.JSX.Element;
export {};
