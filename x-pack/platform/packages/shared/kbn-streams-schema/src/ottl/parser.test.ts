/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { compileOTTL } from './compiler';
import { parseOttl } from './parser';

describe('OTTL Parser', () => {
  it('should parse a simple expression', () => {
    // -----------------------------------------------------------------------------
    // Example Usage
    // -----------------------------------------------------------------------------

    const ottlExample1 = `merge_maps(attributes, ExtractGrokPatterns(body, "%{WORD:abc} %{WORD:def}", true), "upsert")`;
    // const ottlExample1 = `set(resource.attributes["xyz"], attributes[attributes["test"] + attributes["test"]])`;
    // const ottlExample1 = `set(resource.attributes["xyz"], attributes[attributes["test"]])`;
    // const ottlExample1 = `delete_key(resource.attributes, attributes["test"])`;
    // const ottlExample1 = `set(resource.attributes["a"], attributes["test"] + 5)`;
    // set(resource.attributes[attributes["xxxxxx"]], "test-user")
    // const ottlExample1 = `set(sum, metric.sum + 100 / Calculate(attributes["input"]))`;
    const ottlExample2 = `replace_all_patterns(body, " PII ", "[REDACTED]")`;
    const ottlExample3 = `keep_keys(attributes, ["http.method", "http.status_code"])`;
    const ottlExample4 = `set(status.code, 1) where IsMatch(name, ".*default.*") or attributes["db.system"] == nil`;
    const ottlExample5 = `set(foo, Concat(["bar", attributes["baz"]], ":"))`;
    const ottlExample6 = `set(sum, metric.sum + 100 / Calculate(attributes["input"]))`;
    const ottlExample7 = `set(span_id, 0x0123456789abcdef)`;
    const ottlExample8 = `set(my_map, {"key1": "value1", "key2": resource.attributes["id"] + 1})`;
    const ottlExample9 = `set(value, resource.attributes["num"] * (4 - 2)) where not (name == "test")`;

    console.log('--- Example 1 ---');
    const result1 = parseOttl(ottlExample1);
    console.log(ottlExample1);
    // console.log(result1.ast!.editor.arguments[0].value.fields[0].keys); // Should print "user.id"
    console.log(JSON.stringify(result1, null, 2));
    console.log(ottlExample1);
    // console.log(result1.ast!.editor.arguments[0].value.fields[0].keys); // Should print "user.id"
    console.log(JSON.stringify(compileOTTL(result1.ast!), null, 2));
    // if (result1.errors.length > 0) console.error('Errors:', result1.errors);

    // console.log('\n--- Example 6 ---');
    // const result6 = parseOttl(ottlExample6);
    // if (result6.ast) console.log(JSON.stringify(result6.ast, null, 2));
    // if (result6.errors.length > 0) console.error('Errors:', result6.errors);

    // console.log('\n--- Example 8 ---');
    // const result8 = parseOttl(ottlExample8);
    // if (result8.ast) console.log(JSON.stringify(result8.ast, null, 2));
    // if (result8.errors.length > 0) console.error('Errors:', result8.errors);

    // console.log('\n--- Example 9 ---');
    // const result9 = parseOttl(ottlExample9);
    // if (result9.ast) console.log(JSON.stringify(result9.ast, null, 2));
    // if (result9.errors.length > 0) console.error('Errors:', result9.errors);

    // Example with syntax error
    // console.log("\n--- Example Error ---");
    // const resultErr = parseOttl(`set(value, )`); // Syntax error
    // if (resultErr.ast) console.log(JSON.stringify(resultErr.ast, null, 2));
    // if (resultErr.errors.length > 0) console.error("Errors:", resultErr.errors);
  });
});
