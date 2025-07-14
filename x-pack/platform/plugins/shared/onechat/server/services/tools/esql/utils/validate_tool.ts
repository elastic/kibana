/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from "@kbn/esql-validation-autocomplete";
import { createBadRequestError } from "@kbn/onechat-common";
import { EsqlToolDefinition } from "@kbn/onechat-server";

export const validateTool = async (tool: EsqlToolDefinition) => {

    const validationResult = await validateQuery(tool.query, { ignoreOnMissingCallbacks: true });
    
    if (validationResult.errors.length > 0) {
        const message = `Validation error: \n${validationResult.errors.map((error) => 'text' in error ? error.text : '').join('\n')}`;
            throw createBadRequestError(message)
    }

    //pull out query parameters from the query string
    const queryParamMatches = tool.query.match(/\?([a-zA-Z_][a-zA-Z0-9_]*)/g);

    console.log(`Query parameters found in tool ${tool.id}:`, queryParamMatches);
    const queryParams = queryParamMatches ? 
        queryParamMatches.map(match => match.substring(1)) : 
        [];

    const definedParams = Object.keys(tool.params);

    const undefinedParams = queryParams.filter(param => !definedParams.includes(param));
    if (undefinedParams.length > 0) {
        throw createBadRequestError(
            `Query uses undefined parameters: ${undefinedParams.join(', ')}\n` +
            `Available parameters: ${definedParams.join(', ') || 'none'}`
        );
    }

    const unusedParams = definedParams.filter(param => !queryParams.includes(param));
    if (unusedParams.length > 0) {
        throw createBadRequestError(
            `Defined parameters not used in query: ${unusedParams.join(', ')}\n` +
            `Query parameters: ${queryParams.join(', ') || 'none'}`
        );
    }
}

