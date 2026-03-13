/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// antlr4's .d.cts root re-exports from directory barrels (e.g., ./error) that
// only ship index.d.ts (not .d.cts), breaking CJS resolution under nodenext.
// This shim bypasses the barrels by re-exporting individual files directly.

// Individual files (resolve fine)
export * from '../../node_modules/antlr4/src/antlr4/InputStream';
export * from '../../node_modules/antlr4/src/antlr4/FileStream';
export * from '../../node_modules/antlr4/src/antlr4/CharStream';
export * from '../../node_modules/antlr4/src/antlr4/CharStreams';
export * from '../../node_modules/antlr4/src/antlr4/TokenStream';
export * from '../../node_modules/antlr4/src/antlr4/BufferedTokenStream';
export * from '../../node_modules/antlr4/src/antlr4/CommonToken';
export * from '../../node_modules/antlr4/src/antlr4/CommonTokenStream';
export * from '../../node_modules/antlr4/src/antlr4/Recognizer';
export * from '../../node_modules/antlr4/src/antlr4/Lexer';
export * from '../../node_modules/antlr4/src/antlr4/Parser';
export * from '../../node_modules/antlr4/src/antlr4/Token';
export * from '../../node_modules/antlr4/src/antlr4/TokenStreamRewriter';

// atn barrel
export * from '../../node_modules/antlr4/src/antlr4/atn/ATN';
export * from '../../node_modules/antlr4/src/antlr4/atn/ATNConfig';
export * from '../../node_modules/antlr4/src/antlr4/atn/ATNConfigSet';
export * from '../../node_modules/antlr4/src/antlr4/atn/ATNDeserializer';
export * from '../../node_modules/antlr4/src/antlr4/atn/LexerATNSimulator';
export * from '../../node_modules/antlr4/src/antlr4/atn/ParserATNSimulator';
export * from '../../node_modules/antlr4/src/antlr4/atn/PredictionMode';
export * from '../../node_modules/antlr4/src/antlr4/atn/PredictionContextCache';

// dfa barrel
export * from '../../node_modules/antlr4/src/antlr4/dfa/DFA';

// context barrel
export * from '../../node_modules/antlr4/src/antlr4/context/RuleContext';
export * from '../../node_modules/antlr4/src/antlr4/context/ParserRuleContext';

// misc barrel
export * from '../../node_modules/antlr4/src/antlr4/misc/Interval';
export * from '../../node_modules/antlr4/src/antlr4/misc/IntervalSet';

// tree barrel
export * from '../../node_modules/antlr4/src/antlr4/tree/RuleNode';
export * from '../../node_modules/antlr4/src/antlr4/tree/ErrorNode';
export * from '../../node_modules/antlr4/src/antlr4/tree/TerminalNode';
export * from '../../node_modules/antlr4/src/antlr4/tree/ParseTree';
export * from '../../node_modules/antlr4/src/antlr4/tree/ParseTreeListener';
export * from '../../node_modules/antlr4/src/antlr4/tree/ParseTreeVisitor';
export * from '../../node_modules/antlr4/src/antlr4/tree/ParseTreeWalker';

// state barrel
export * from '../../node_modules/antlr4/src/antlr4/state/ATNState';
export * from '../../node_modules/antlr4/src/antlr4/state/DecisionState';
export * from '../../node_modules/antlr4/src/antlr4/state/RuleStartState';
export * from '../../node_modules/antlr4/src/antlr4/state/RuleStopState';

// error barrel
export * from '../../node_modules/antlr4/src/antlr4/error/RecognitionException';
export * from '../../node_modules/antlr4/src/antlr4/error/NoViableAltException';
export * from '../../node_modules/antlr4/src/antlr4/error/FailedPredicateException';
export * from '../../node_modules/antlr4/src/antlr4/error/InputMismatchException';
export * from '../../node_modules/antlr4/src/antlr4/error/ErrorStrategy';
export * from '../../node_modules/antlr4/src/antlr4/error/BailErrorStrategy';
export * from '../../node_modules/antlr4/src/antlr4/error/DefaultErrorStrategy';
export * from '../../node_modules/antlr4/src/antlr4/error/ErrorListener';
export * from '../../node_modules/antlr4/src/antlr4/error/DiagnosticErrorListener';

// utils barrel
export * from '../../node_modules/antlr4/src/antlr4/utils/stringToCharArray';
export * from '../../node_modules/antlr4/src/antlr4/utils/arrayToString';
export * from '../../node_modules/antlr4/src/antlr4/utils/Printer';
