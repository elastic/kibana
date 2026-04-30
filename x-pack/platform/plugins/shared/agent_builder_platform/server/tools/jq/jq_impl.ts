/* eslint-disable */
// @ts-nocheck
// Inlined from https://github.com/mwh/jqjs (MIT License)
// Copyright (C) 2018-2026 Michael Homer

// jqjs - jq JSON query language in JavaScript
// Copyright (C) 2018-2026 Michael Homer
/*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/


/**
 * Compiles a jq program string into a generator function that produces all
 * the program's outputs given the initial input value.
 *
 * @param {string} prog - jq source code to compile.
 * @returns {((input: JQValue) => Generator<JQValue, void, unknown>) & {
 *   filter: {node: ParseNode},
 *   ast: ParseNode,
 *   trace: (input: any) => { node: null, output: any, next: any[] }
 * }} A function that applies the compiled filter to input data. The returned function
 * also has an `ast` property containing the parsed syntax tree, and a `trace` method
 * for tracing filter execution.
 */
function compile(prog) {
    let filter = parse(tokenise(prog).tokens)
    const ret = input => filter.node.apply(input, {
        userFuncArgs: {},
        variables: {}
    })
    ret.filter = filter
    ret.ast = filter.node
    ret.trace = (input) => {
        let dest = []
        filter.node.trace(input, {
            userFuncArgs: {},
            variables: {}
        }, dest)
        return {
            node: null,
            output: input,
            next: dest,
        }
    }
    return ret
}

function compileNode(prog) {
    return parse(tokenise(prog).tokens).node
}

function isAlpha(c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'
}

function isDigit(c) {
    return (c >= '0' && c <= '9')
}

function prettyPrint(val, indent='', step='    ', LF='\n') {
    let SP = step ? ' ' : ''
    if (typeof val == 'undefined')
        return val
    if (val === null) {
        return 'null'
    } else if (val instanceof Array) {
        let ret = '['
        let first = true
        for (let v of Object.values(val)) {
            ret += (first ? '' : ',') + LF + indent + step +
                prettyPrint(v, indent + step, step, LF)
            first = false
        }
        ret += LF + indent + ']'
        return ret
    } else if (typeof val == 'object') {
        let ret = '{'
        let first = true
        for (let k of Object.keys(val)) {
            ret += (first ? '' : ',') + LF + indent + step +
                '"' + k + '":' +SP+ prettyPrint(val[k], indent + step, step, LF)
            first = false
        }
        ret += LF + indent + '}'
        return ret
    } else if (typeof val == 'string') {
        return '"' + escapeString(val) + '"'
    } else if (typeof val == 'number') {
        return '' + val
    } else if (typeof val == 'boolean') {
        return val ? 'true' : 'false'
    }
}

function escapeString(s) {
    s = s.replace(/\\/g, '\\\\')
    s = s.replace(/"/g, '\\"')
    s = s.replace(/\n/g, '\\n')
    s = s.replace(/[\x00-\x1f]/g,
        x => '\\u00' + x.charCodeAt(0).toString(16).padStart(2, '0'))
    return s
}

function* zip(a, b) {
    let aa = a[Symbol.iterator]()
    let bb = b[Symbol.iterator]()
    let v1 = aa.next()
    let v2 = bb.next()
    while (!v1.done && !v2.done) {
        yield [v1.value, v2.value]
        v1 = aa.next()
        v2 = bb.next()
    }
}

// Implements the jq ordering algorithm, which is terrible.
function compareValues(a, b) {
    let at = nameType(a)
    let bt = nameType(b)
    if (at != bt) {
        return compareValues.typeOrder.indexOf(at) -
            compareValues.typeOrder.indexOf(bt)
    }
    if (at == 'boolean') {
        if (a && !b) return 1
        if (!a && b) return -1
    } else if (at == 'number') {
        return a - b
    } else if (at == 'string') {
        if (a < b) return -1
        if (b < a) return 1
    } else if (at == 'array') {
        for (let i = 0; i < a.length; i++) {
            let v1 = a[i]
            let v2 = b[i]
            if (typeof v1 == 'undefined' && typeof v2 != 'undefined')
                return -1
            else if (typeof v1 != 'undefined' && typeof v2 == 'undefined')
                return 1
            else if (typeof v1 == 'undefined') return 0
            let c = compareValues(v1, v2)
            if (c != 0) return c
        }
        return 0
    } else if (at == 'object') {
        let ka = Object.keys(a).sort()
        let kb = Object.keys(b).sort()
        let c = compareValues(ka, kb)
        if (c) return c
        for (let k of ka) {
            c = compareValues(a[k], b[k])
            if (c) return c
        }
    }
    return 0
}
compareValues.typeOrder = ['null', 'boolean', 'number', 'string',
                           'array', 'object']

// Create a function from a program string.
//
// params is an array of parameter names
// body is a jq program as a string, which may use the parameters
//
// For example:
//     makeFunc(['f'], '[.[] | f]')
// defines the map function.
function makeFunc(params, body, pathFunc=false) {
    let c = compileNode(body)
    return makeUserFuncFromNode(params, c, pathFunc)
}

// Lift a node to a function
function makeUserFuncFromNode(params, node, pathFunc=false) {
    let c = node
    let f = (x, conf) => c.apply(x, conf)
    if (pathFunc)
        f = (x, conf) => c.paths(x, conf)
    let ret = function*(input, conf, args) {
        let origArgs = conf.userFuncArgs
        conf.userFuncArgs = Object.create(origArgs)
        for (let i = 0; i < params.length; i++) {
            let pn = params[i]
            let pv = args[i]
            conf.userFuncArgs[pn + '/0'] = pv
        }
        yield* f(input, conf)
        conf.userFuncArgs = origArgs
    }
    ret.params = Array.prototype.map.call(params, label => ({label, mode: 'defer'}))
    return ret;
}

// Define and save a function that is shorthand for a longer expression
//
// name is the name of the function
// params is an array of parameters, or a string of one-character names
// body is a jq program as a string
function defineShorthandFunction(name, params, body) {
    let fname = name + '/' + params.length
    functions[fname] = makeFunc(params, body)
    functions[fname].params = Array.prototype.map.call(params, label => ({label, mode: 'defer'}))
    functions[fname + '-paths'] = makeFunc(params, body, true)
}

// Recursive-descent parser for JQ query language

// Split input program into tokens. Tokens are:
// quote, number, identifier-index, dot-square, dot, left-square,
// right-square, left-paren, right-paren, pipe, comma,
// identifier, colon, left-brace, right-brace, semicolon, at,
// variable, as, reduce, foreach, def, import, include, question
// if, then, else, end, elif
const KEYWORDS = ['as', 'reduce', 'foreach', 'import', 'include', 'def', 'if', 'then', 'else', 'end', 'elif', 'and', 'or'];
function tokenise(str, startAt=0, parenDepth) {
    let ret = []
    function error(msg) {
        throw msg;
    }
    let i
    let lineNum = 1
    let lineStart = 0;
    toplevel: for (i = startAt; i < str.length; i++) {
        let location = lineNum + ':' + (i - lineStart + 1);
        let c = str[i]
        if (c == ' ')
            continue;
        if (c == '\n') {
            lineNum++;
            lineStart = i;
            continue;
        }
        if (c == '"' || c == "'") {
            let st = c
            let tok = ""
            let escaped = false
            let uniEsc
            let cu = 0
            for (i++; i < str.length; i++) {
                if (uniEsc) {
                    uniEsc--
                    cu *= 16
                    cu += Number.parseInt(str[i], 16)
                    if (uniEsc == 0) {
                        tok += String.fromCharCode(cu)
                        cu = 0
                    }
                } else if (escaped) {
                    let q = str[i]
                    if (q == '"' || q == "'") tok += q
                    else if (q == 'n') tok += '\n'
                    else if (q == 't') tok += '\t'
                    else if (q == 'r') tok += '\r'
                    else if (q == 'b') tok += '\b'
                    else if (q == 'f') tok += '\f'
                    else if (q == '/') tok += '/'
                    else if (q == '\\')tok += '\\'
                    else if (q == 'u') uniEsc = 4
                    else if (q == '(') {
                        // Interpolation
                        let r = tokenise(str, i + 1, 0)
                        ret.push({type: 'quote-interp', value: tok, location})
                        tok = ''
                        ret = ret.concat(r.tokens)
                        i = r.i
                    }
                    else throw "invalid escape " + q
                    escaped = false
                } else if (str[i] == '\\') {
                    escaped = true
                } else if (str[i] == st) {
                    ret.push({type: 'quote', value: tok, location})
                    continue toplevel
                } else {
                    escaped = false
                    tok += str[i]
                }
            }
            error("unterminated string literal")
        } else if (isDigit(c)) {
            let tok = ''
            while (isDigit(str[i]) || str[i] == '.')
                tok += str[i++]
            ret.push({type: 'number', value: Number.parseFloat(tok), location})
                i--
        } else if (c == '.') {
            let d = str[i+1]
            if (isAlpha(d)) {
                i++
                let tok = ''
                while (isAlpha(str[i]) || isDigit(str[i]))
                    tok += str[i++]
                ret.push({type: 'identifier-index', value: tok, location})
                i--
            } else if (d == '[') {
                i++
                ret.push({type: 'dot-square', location})
            } else if (d == '.') {
                i++
                ret.push({type: 'dot-dot', location})
            } else {
                ret.push({type: 'dot', location})
            }
        } else if (c == '$') {
            let d = str[i+1]
            i++
            let tok = ''
            while (isAlpha(str[i]) || isDigit(str[i])) {
                tok += str[i]
                i++
            }
            ret.push({type: 'variable', name: tok, location})
            i--
        } else if (c == '[') {
            ret.push({type: 'left-square', location})
        } else if (c == ']') {
            ret.push({type: 'right-square', location})
        } else if (c == '(') {
            ret.push({type: 'left-paren', location})
            parenDepth++
        } else if (c == ')') {
            ret.push({type: 'right-paren', location})
            parenDepth--
            if (parenDepth < 0)
                return {tokens: ret, i}
        } else if (c == '{') {
            ret.push({type: 'left-brace', location})
        } else if (c == '}') {
            ret.push({type: 'right-brace', location})
        } else if (c == ',') {
            ret.push({type: 'comma', location})
        } else if (c == ';') {
            ret.push({type: 'semicolon', location})
        } else if (c == '@') {
            ret.push({type: 'at', location})
        } else if (c == '?') {
            ret.push({type: 'question', location})
        } else if (c == '|') {
            let d = str[i+1]
            if (d == '=') {
                ret.push({type: 'pipe-equals', location})
                i++
            } else
                ret.push({type: 'pipe', location})
        // Infix operators
        } else if (c == '+' || c == '*' || c == '-' || c == '/' || c == '%'
                || c == '<' || c == '>') {
            if (c == '/' && str[i+1] == '/') {
                c = '//'
                i++
            }
            if (str[i+1] == '=') {
                if (c == '<' || c == '>')
                    ret.push({type: 'op', op: c + '=', location})
                else
                    ret.push({type: 'op-equals', op: c, location})
                i++
            } else
                ret.push({type: 'op', op: c})
        } else if (c == '=') {
            if (str[i + 1] != '=') {
                ret.push({type: 'equals'})
            } else {
                i++
                ret.push({type: 'op', op: '==', location})
            }
        } else if (c == '!') {
            if (str[i + 1] != '=')
                throw 'unexpected ! at ' + location
            i++
            ret.push({type: 'op', op: '!=', location})
        } else if (isAlpha(c)) {
            let tok = ''
            while (isAlpha(str[i]) || isDigit(str[i]) || str[i] == '_')
                tok += str[i++]
            if (tok == "and" || tok == "or") {
                ret.push({type: 'op', op: tok, value: tok, location})
            } else if (KEYWORDS.includes(tok)) {
                ret.push({type: tok, value: tok, location})
            } else {
                ret.push({type: 'identifier', value: tok, location})
            }
            i--
        } else if (c == ':') {
            ret.push({type: 'colon', location})
        } else if (c == '#') {
            while (str[i] != '\n' && str[i] != undefined)
                i++;
            lineNum++;
            lineStart = i;
        }
    }
    ret.push({type: '<end-of-program>', location: lineNum + ':' + (i - lineStart + 1)})
    return {tokens: ret, i}
}

function describeLocation(token) {
    if (token) {
        return token.location
    }
    return '<end>'
}

// Parse a token stream by recursive descent.
//
// Returns {node: {*apply(input, conf)}, i}, where i is the position in the
// token stream and node is one of the filtering nodes defined below.
// Returns at end of stream or when a token of type until is found.
/**
 * 
 * @param {any[]} tokens 
 * @param {number} startAt 
 * @param {string[]} until 
 * @returns { {node: ParseNode, i: number} }
 */
function parse(tokens, startAt=0, until=[]) {
    let i = startAt
    let t = tokens[i]
    let ret = []
    let commaAccum = []
    while (t && (until.indexOf(t.type) == -1)) {
        // Simple cases
        if (t.type == 'identifier-index') {
            ret.push(new IdentifierIndex(t.value))
        } else if (t.type == 'number') {
            ret.push(new NumberNode(t.value))
        } else if (t.type == 'quote') {
            ret.push(new StringNode(t.value))
        } else if (t.type == 'dot') {
            ret.push(new IdentityNode())
        } else if (t.type == 'dot-dot') {
            ret.push(new RecursiveDescent())
        } else if (t.type == 'identifier') {
            if (t.value == 'true' || t.value == 'false')
                ret.push(new BooleanNode(t.value == 'true'))
            else if (t.value == 'null')
                ret.push(new BooleanNode(null))
            else {
                // Named function
                let fname = t.value
                let args = []
                if (tokens[i+1] && tokens[i+1].type == 'left-paren') {
                    i++
                    while (tokens[i].type != 'right-paren') {
                        let arg = parse(tokens, i + 1,
                            ['semicolon', 'right-paren'])
                        args.push(arg.node)
                        i = arg.i
                    }
                }
                ret.push(new FunctionCall(fname + '/' + args.length, args))
            }
        // Recursive square bracket cases
        } else if (t.type == 'dot-square') {
            let r = parseDotSquare(tokens, i)
            ret.push(r.node)
            i = r.i
        } else if (t.type == 'left-square') {
            // Find the body of the brackets first
            let r = parse(tokens, i + 1, ['right-square', 'colon'])
            if (ret.length) {
                let lhs = makeFilterNode(ret)
                ret = []
                if (tokens[r.i].type == 'colon') {
                    // Slice
                    if (r.node.length === 0)
                        r.node = new NumberNode(0)
                    let e = parse(tokens, r.i + 1, ['right-square'])
                    if (e.node.length === 0)
                        e.node = new NumberNode(-1)
                    ret.push(new SliceNode(lhs, r.node, e.node))
                    r = e
                } else if (r.node.length === 0)
                    ret.push(new SpecificValueIterator(lhs))
                else
                    ret.push(new IndexNode(lhs, r.node))
            } else {
                ret.push(new ArrayNode(r.node))
            }
            i = r.i
        // Recursive parenthesis case
        } else if (t.type == 'left-paren') {
            // Find the body of the brackets first
            let r = parse(tokens, i + 1, ['right-paren'])
            ret.push(r.node)
            i = r.i
        // Object literal
        } else if (t.type == 'left-brace') {
            let r = parseObject(tokens, i + 1)
            ret.push(r.node)
            i = r.i
        // Format @x
        } else if (t.type == 'at') {
            let n = tokens[++i]
            if (!n || n.type != 'identifier')
                throw 'expected identifier after @ at ' +
                    describeLocation(n)
            let fmt = n.value
            if (!formats[fmt])
                throw 'not a valid format: ' + fmt
            let q
            if (tokens[i+1] && tokens[i+1].type == 'quote-interp') {
                ({q, i} = parseStringInterpolation(tokens, i + 1))
                i = i
            }
            ret.push(new FormatNode(fmt, q))
        // Comma consumes everything previous and splits in-place
        // (parsing carries on in this method)
        } else if (t.type == 'comma') {
            commaAccum.push(makeFilterNode(ret))
            ret = []
        // Pipe consumes everything previous *including* commas
        // and splits by recursing for the right-hand side.
        // "as" indicates a variable binding.
        } else if (t.type == 'pipe' || t.type == 'as') {
            if (commaAccum.length) {
                // .x,.y | .[1] is the same as (.x,.y) | .[1]
                commaAccum.push(makeFilterNode(ret))
                ret = [new CommaNode(commaAccum)]
                commaAccum = []
            }
            let lhs = makeFilterNode(ret)
            if (t.type == 'as') {
                let nameTok = tokens[i+1]
                if (nameTok.type != 'variable')
                    throw 'expected variable name after as at ' + describeLocation(tokens[i]) + ' not ' + tokens[i].type
                lhs = new VariableBinding(lhs, nameTok.name)
                i += 2
            }
            let r = parse(tokens, i + 1, until)
            let rhs = r.node
            i = r.i
            if (tokens[i] && until.indexOf(tokens[i].type) != -1)
                i--
            ret = [new PipeNode(lhs, rhs)]
        // Question mark suppresses errors on the preceding filter
        } else if (t.type == 'question') {
            let p = ret.pop()
            if (!p)
                throw 'unexpected ? without preceding filter at ' +
                    describeLocation(t)
            ret.push(new ErrorSuppression(p))
        // Infix operators
        } else if (t.type == 'op') {
            if (ret.length == 0 && t.op == '-' && tokens[i+1].type == 'number') {
                tokens[i+1].value = -tokens[i+1].value
                t = tokens[++i]
                continue
            }
            let lhs = makeFilterNode(ret)
            let op = t.op
            let stream = [lhs, t]
            let r = parse(tokens, i + 1, ['op', 'comma', 'pipe', 'right-paren',
                'right-brace', 'right-square', '<end-of-program>'].concat(until))
            i = r.i
            stream.push(r.node)
            while (i < tokens.length && tokens[i].type == 'op') {
                stream.push(tokens[i])
                let r = parse(tokens, i + 1, ['op', 'comma', 'pipe',
                    'right-paren', 'right-brace', 'right-square', '<end-of-program>'].concat(until))
                i = r.i
                stream.push(r.node)
            }
            ret = [shuntingYard(stream)]
            if (tokens[i]) i--
        // Update-assignment
        } else if (t.type == 'pipe-equals') {
            let lhs = makeFilterNode(ret)
            let r = parse(tokens, i + 1, ['comma', 'pipe', 'right-paren',
                'right-brace', 'right-square', '<end-of-program>'].concat(until))
            i = r.i - 1
            let rhs = r.node
            ret = [new UpdateAssignment(lhs, rhs)]
        // Plain assignment
        } else if (t.type == 'equals') {
            let lhs = makeFilterNode(ret)
            let r = parse(tokens, i + 1, ['comma', 'pipe', 'right-paren',
                'right-brace', 'right-square', '<end-of-program>'].concat(until))
            i = r.i - 1
            let rhs = r.node
            ret = [new PlainAssignment(lhs, rhs)]
        // Arithmetic update-assignment
        } else if (t.type == 'op-equals') {
            let lhs = makeFilterNode(ret)
            let r = parse(tokens, i + 1, ['comma', 'pipe', 'right-paren',
                'right-brace', 'right-square', '<end-of-program>'].concat(until))
            i = r.i - 1
            let rhs = r.node
            rhs = shuntingYard([new IdentityNode(), {type: 'op', op: t.op},
                rhs])
            ret = [new UpdateAssignment(lhs, rhs)]
        // reduce .[] as $item (0, . + $item)
        } else if (t.type == 'reduce') {
            let r = parse(tokens, i + 1, ['as'])
            i = r.i
            let generator = r.node
            i++ // 'as'
            if (tokens[i].type != 'variable')
                throw 'expected variable name in reduce at ' + describeLocation(tokens[i]) + ' not ' + tokens[i].type
            let name = tokens[i].name
            i++
            if (tokens[i].type != 'left-paren')
                throw 'expected left-paren in reduce at ' +
                    describeLocation(tokens[i])
            r = parse(tokens, i + 1, ['semicolon'])
            i = r.i
            let init = r.node
            r = parse(tokens, i + 1, ['right-paren'])
            i = r.i
            let expr = r.node
            ret.push(new ReduceNode(generator, name, init, expr))
        // foreach .[] as $item (0; . + $item; . * 2)
        } else if (t.type == 'foreach') {
            let r = parse(tokens, i + 1, ['as'])
            i = r.i
            let generator = r.node
            i++ // 'as'
            if (tokens[i].type != 'variable')
                throw 'expected variable name in foreach at ' + describeLocation(tokens[i]) + ' not ' + tokens[i].type
            let name = tokens[i].name
            i++
            if (tokens[i].type != 'left-paren')
                throw 'expected left-paren in foreach at ' +
                    describeLocation(tokens[i])
            r = parse(tokens, i + 1, ['semicolon'])
            i = r.i
            let init = r.node
            r = parse(tokens, i + 1, ['right-paren', 'semicolon'])
            i = r.i
            let update = r.node
            let extract = new IdentityNode();
            if (tokens[i].type == 'semicolon') {
                r = parse(tokens, i + 1, ['right-paren']);
                i = r.i;
                extract = r.node
            }
            ret.push(new ForeachNode(generator, name, init, update, extract))
        // Interpolated string literal
        } else if (t.type == 'quote-interp') {
            let q
            ({q, i} = parseStringInterpolation(tokens, i))
            ret.push(q)
        // Variable reference
        } else if (t.type == 'variable') {
            ret.push(new VariableReference(t.name))
        // Conditional if-then-(elif-then)*-else?-end
        } else if (t.type == 'if') {
            let conds = []
            let trueExprs = []
            let falseExpr = null
            while (tokens[i] && (tokens[i].type == 'if' || tokens[i].type == 'elif')) {
                let cond = parse(tokens, i + 1, ['then'])
                if (!tokens[cond.i] || tokens[cond.i].type != 'then')
                    throw 'expected then at ' +
                        describeLocation(tokens[cond.i]) +
                        ', from ' + tokens[i].type + ' at ' + tokens[i].location
                let trueExpr = parse(tokens, cond.i + 1, ['else', 'elif', 'end'])
                if (trueExpr.i == cond.i + 1)
                    throw 'expected expression after then at ' +
                        describeLocation(tokens[cond.i + 1]) + ', not ' +
                        tokens[cond.i + 1].type
                i = trueExpr.i
                conds.push(cond.node)
                trueExprs.push(trueExpr.node)
            }
            if (tokens[i] && tokens[i].type == 'else') {
                let elseCase = parse(tokens, i + 1, ['end'])
                i = elseCase.i
                falseExpr = elseCase.node
            }
            if (!tokens[i] || tokens[i].type != 'end')
                throw 'expected end at ' + describeLocation(tokens[i]) + ' from if at ' + t.location
            ret.push(new IfNode(conds, trueExprs, falseExpr))
        } else if (t.type == 'def') {
            let nameTok = tokens[++i];
            let name = nameTok.value;
            i++;
            if (!tokens[i] || tokens[i].type != 'colon' && tokens[i].type != 'left-paren')
                throw 'expected : or parameter list when defining function ' + nameTok.value + ' at ' + t.location
            let params = [];
            let varParams = [];
            if (tokens[i].type == 'left-paren') {
                i++;
                while (tokens[i] && tokens[i].type != 'right-paren') {
                    if (tokens[i].type == 'variable') { // def foo($f), translated to a pipe to that variable
                        varParams.push({truename: '$inner' + params.length + '/0', bindname: tokens[i].name});
                        params.push('$inner' + params.length)
                    } else {
                        if (tokens[i].type != 'identifier')
                            throw 'expected identifier as parameter name in function ' + name + ' at ' + tokens[i].location
                        params.push(tokens[i].value);
                    }
                    i++;
                    if (tokens[i] && tokens[i].type == 'right-paren') {}
                    else if (tokens[i] && tokens[i].type == 'semicolon') { i++; }
                    else {
                        throw 'expected ) or semicolon in parameter list of function ' + name + ' at ' + tokens[i].location
                    }
                }
                if (!tokens[i] || tokens[i].type != 'right-paren')
                    throw 'expected ) to terminate parameter list of function ' + name + ' at ' + nameTok.location;
                i++;
            }
            if (!tokens[i] || tokens[i].type != 'colon')
                throw 'expected : when defining function ' + nameTok.value + ' at ' + t.location

            let {node, i: j} = parse(tokens, i + 1, ['semicolon']);
            // If there are $var parameters, bind the arguments as single values
            for (let vp of varParams) {
                let lhs = new VariableBinding(new FunctionCall(vp.truename, []), vp.bindname);
                node = new PipeNode(lhs, node);
            }
            let func = makeUserFuncFromNode(params, node);
            functions[name + '/' + params.length] = func;
            let pathFunc = makeUserFuncFromNode(params, node, true);
            functions[name + '/' + params.length + '-paths'] = pathFunc;
            i = j;
        } else if (t.type == '<end-of-program>' && until.length == 0) {
            break
        } else {
            throw 'could not handle token ' + t.type + ' at ' + describeLocation(t) + (until.length > 0 ? ', expected ' + until.join('/') : '')
        }
        t = tokens[++i]
    }
    // If a comma appeared this array is non-empty and contains all
    // previous branches.
    if (commaAccum.length) {
        commaAccum.push(makeFilterNode(ret))
        return {node: new CommaNode(commaAccum), i}
    }
    return {node: makeFilterNode(ret), i}
}

function makeFilterNode(ret) {
    if (ret.length == 1)
        return ret[0]
    return new FilterNode(ret)
}

// Consumes pairs (quote-interp, expression up to rparen)* followed by
// a bare string and returns a StringLiteral node with the interleaving
// lists.
function parseStringInterpolation(tokens, i) {
    let t = tokens[i]
    let strings = []
    let interps = []
    strings.push(t.value)
    // Always followed by a paren expression afterwards
    let inner = parse(tokens, i + 1, ['right-paren'])
    i = inner.i + 1
    interps.push(inner.node)
    while (tokens[i].type == 'quote-interp') {
        strings.push(tokens[i].value)
        inner = parse(tokens, i + 1, ['right-paren'])
        i = inner.i + 1
        interps.push(inner.node)
    }
    // Must be the ending quote now
    strings.push(tokens[i].value)
    return {q:new StringLiteral(strings, interps), i}
}

function parseDotSquare(tokens, startAt=0) {
    let i = startAt
    let ds = tokens[i]
    i++
    if (tokens[i].type == 'right-square')
        return {node: new GenericValueIterator(), i}
    let r = parse(tokens, i, ['right-square', 'colon'])
    if (tokens[r.i].type == 'colon') {
        // Slice
        let fr = r
        if (fr.length === 0)
            fr.node = new NumberNode(0)
        r = parse(tokens, r.i + 1, ['right-square'])
        if (r.length === 0)
            r.node = new NumberNode(-1)
        return {node: new GenericSlice(fr.node, r.node), i: r.i}
    }
    return {node: new GenericIndex(r.node), i: r.i}
}

// Parse an object literal, expecting to start immediately inside the
// left brace and to consume up to and including the right brace.
function parseObject(tokens, startAt=0) {
    let i = startAt
    let fields = []
    while (tokens[i].type != 'right-brace') {
        if (tokens[i].type == 'identifier' || KEYWORDS.includes(tokens[i].type)) {
            // bare name x
            let ident = tokens[i++]
            if (tokens[i].type == 'colon') {
                // with value x: val
                let r = parse(tokens, i + 1, ['comma', 'right-brace'])
                i = r.i
                fields.push({
                    key: new StringNode(ident.value),
                    value: r.node,
                })
                i--
            } else if (tokens[i].type == 'comma') {
                // no value: equivalent to x : .x
                fields.push({
                    key: new StringNode(ident.value),
                    value: new IdentifierIndex(ident.value),
                })
            } else if (tokens[i].type == 'right-brace') {
                // ditto, last field: equivalent to x : .x
                fields.push({
                    key: new StringNode(ident.value),
                    value: new IdentifierIndex(ident.value),
                })
                i--
            }
        } else if (tokens[i].type == 'quote') {
            // quoted-string key: "x" : val
            let ident = tokens[i++]
            if (tokens[i].type == 'colon') {
                let r = parse(tokens, i + 1, ['comma', 'right-brace'])
                i = r.i
                fields.push({
                    key: new StringNode(ident.value),
                    value: r.node,
                })
                i--
            } else {
                throw 'unexpected ' + tokens[i].type + ', expected colon at ' +
                    describeLocation(tokens[i])
            }
        } else if (tokens[i].type == 'left-paren') {
            // computed key: (.x | .y) : val
            let kr = parse(tokens, i + 1, ['right-paren'])
            i = kr.i + 1
            if (tokens[i].type == 'colon') {
                let r = parse(tokens, i + 1, ['comma', 'right-brace'])
                i = r.i
                fields.push({
                    key: kr.node,
                    value: r.node,
                })
                i--
            } else {
                throw 'unexpected ' + tokens[i].type + ', expected colon at ' +
                    describeLocation(tokens[i])
            }
        } else if (tokens[i].type == 'variable') {
            // variable key: $x : val
            let varTok = tokens[i++]
            if (tokens[i].type == 'colon') {
                let r = parse(tokens, i + 1, ['comma', 'right-brace'])
                i = r.i
                fields.push({
                    key: new VariableReference(varTok.name),
                    value: r.node,
                })
                i--
            } else if (tokens[i].type == ',' || tokens[i].type == 'right-brace') {
                // variable key-value: { $x } -> { "x": $x }
                fields.push({
                    key: new StringNode(varTok.name),
                    value: new VariableReference(varTok.name),
                })
                i--
            } else {
                throw 'unexpected ' + tokens[i].type + ', expected colon at ' +
                    describeLocation(tokens[i])
            }
        } else {
            throw 'unexpected ' + tokens[i].type + ' at ' +
                describeLocation(tokens[i]) + ' in object at ' +
                describeLocation(tokens[startAt - 1])
        }
        i++
        // Consume a comma after a field
        if (tokens[i].type == 'comma')
            i++
    }
    return {
        node: new ObjectNode(fields),
        i
    }
}

function shuntingYard(stream) {
    const prec = { '+' : 5, '-' : 5, '*' : 10, '/' : 10, '%' : 10,
        '//' : 2, '==': 3, '!=': 3, '>': 3, '<': 3, '>=': 3, '<=': 3,
        'and': 1, 'or': 0 }
    let output = []
    let operators = []
    for (let x of stream) {
        if (x.type == 'op') {
            while (operators.length && prec[operators[0].op] >= prec[x.op])
                output.push(operators.shift())
            operators.unshift(x)
        } else {
            output.push(x)
        }
    }
    for (let o of operators)
        output.push(o)
    let constructors = {
        '+': AdditionOperator,
        '*': MultiplicationOperator,
        '-': SubtractionOperator,
        '/': DivisionOperator,
        '%': ModuloOperator,
        '//': AlternativeOperator,
        '==': EqualsOperator,
        '!=': NotEqualsOperator,
        '<': LessThanOperator,
        '>': GreaterThanOperator,
        '<=': LessEqualsOperator,
        '>=': GreaterEqualsOperator,
        'and': AndOperator,
        'or': OrOperator,
    }
    let stack = []
    for (let o of output) {
        if (o.type == 'op') {
            let r = stack.pop()
            let l = stack.pop()
            stack.push(new constructors[o.op](l, r))
        } else {
            stack.push(o)
        }
    }
    return stack[0]
}

function trace_helper(input, conf, dest, rest) {
    let filter = rest[0]
    for (let v of filter.apply(input, conf)) {
        let next = []
        dest.push({
            node: filter,
            output: v,
            next,
            variables: JSON.parse(JSON.stringify(conf.variables)),
        })
        if (rest.length > 1) {
            trace_helper(v, conf, next, rest.slice(1))
        }
    }
}

function sourced_trace_helper(input, conf, dest, rest) {
    let forward = []
    let src = this
    while (src.source) {
        if (src.filter) {
            forward.unshift(src.filter)
            src = src.source
        } else {
            src = src.source
        }
    }
    forward.unshift(src)
    trace_helper(input, conf, dest, forward)
}

// Convert a value to a consistent type name, addressing the issue
// that arrays are objects.
function nameType(o) {
    if (o === null) return 'null'
    if (typeof o == 'number') return 'number'
    if (typeof o == 'string') return 'string'
    if (typeof o == 'boolean') return 'boolean'
    if (o instanceof Array) return 'array'
    if (typeof o == 'object') return 'object'
}

// Parse node classes follow. Parse nodes are:
//   FilterNode, generic juxtaposition combination
//   IndexNode, lhs[rhs]
//   SliceNode, lhs[from:to]
//   GenericIndex, .[index]
//   IdentifierIndex .index (delegates to GenericIndex("index"))
//   GenericSlice, .[from:to]
//   IdentityNode, .
//   ValueNode, parent of string/number/boolean
//   StringNode, "abc"
//   NumberNode, 123.45
//   BooleanNode, true/false
//   SpecificValueIterator, lhs[] (yields values from lhs)
//   GenericValueIterator, .[] (yields values from input)
//   CommaNode, .x, .y, .z
//   ArrayNode, [...]
//   PipeNode, a | b | c
//   ObjectNode { x : y, z, "a b" : 12, (.x.y) : .z }
//   RecursiveDescent, ..
//   OperatorNode, a binary infix operator
//   AdditionOperator, a + b
//   MultiplicationOperator, a * b
//   SubtractionOperator, a - b
//   DivisionOperator, a / b
//   ModuloOperator, a % b
//   EqualsOperator, a == b
//   NotEqualsOperator, a != b
//   AlternativeOperator, a // b
//   UpdateAssignment, .x.y |= .z
//   FunctionCall, fname(arg1; arg2)
//   FormatNode, @format, @format "a\(...)"
//   ErrorSuppression, foo?
//   VariableBinding, ... as $x (not the pipe)
//   VariableReference, $x
//   ReduceNode, reduce .[] as $x (0; . + $x)
//   IfNode, if a then b elif c then d else e end
class ParseNode {
    trace(input, conf, dest) {
        for (let v of this.apply(input, conf)) {
            dest.push({
                node: this,
                output: v,
                next: [],
            })
        }
    }
    toString() {
        return '<' + this.constructor.name + '>'
    }
    /**
     * Evaluate this ParseNode at a given input value, with provided
     * function and variable definitions.
     * 
     * @param {JQValue} input 
     * @param { {variables: { [key: string]: JQValue }, userFuncArgs: { [key: string]: ParseNode } } } conf
     * @returns {IterableIterator<JQValue>}
     */
    * apply(input, conf) {
        throw 'apply not implemented for ' + this.constructor.name
    }
}
class FilterNode extends ParseNode {
    constructor(nodes) {
        super()
        this.length = nodes.length
        let p = nodes.pop()
        if (p) {
            this.filter = p
            this.source = nodes.length == 1 ? nodes[0] : new FilterNode(nodes)
        }
    }
    * apply(input, conf) {
        if (!this.filter)
            return
        for (let v of this.source.apply(input, conf)) {
            yield* this.filter.apply(v, conf)
        }
    }
    * paths(input, conf) {
        if (!this.filter) {
            return []
        }
        for (let v of this.source.paths(input, conf)) {
            for (let w of this.filter.paths(input, conf)) {
                yield v.concat(w)
            }
        }
    }
    trace = sourced_trace_helper
    toString() {
        return (this.source ? this.source.toString() : '') + (this.filter ? this.filter.toString() : '')
    }
}
class IndexNode extends ParseNode {
    constructor(lhs, index) {
        super()
        this.lhs = lhs
        this.index = index
    }
    * apply(input, conf) {
        for (let l of this.lhs.apply(input, conf)) {
            let t = nameType(l)
            for (let i of this.index.apply(input, conf)) {
                if (t == 'array' && nameType(i) != 'number')
                    throw 'Cannot index array with ' + nameType(i) + ' ' +
                        JSON.stringify(i)
                else if (t == 'object' && nameType(i) != 'string')
                    throw 'Cannot index object with ' + nameType(i) + ' ' +
                        JSON.stringify(i)
                if (typeof i == 'number' && i < 0 && nameType(l) == 'array')
                    yield l[l.length + i]
                else
                    yield typeof l[i] == 'undefined' ? null : l[i]
            }
        }
    }
    * paths(input, conf) {
        for (let l of this.lhs.paths(input, conf))
            for (let a of this.index.apply(input, conf))
                yield l.concat([a])
    }
    toString() {
        return this.lhs.toString() + '[' + this.index.toString() + ']'
    }
}
class SliceNode extends ParseNode {
    constructor(lhs, from, to) {
        super()
        this.lhs = lhs
        this.from = from
        this.to = to
    }
    * apply(input, conf) {
        for (let l of this.lhs.apply(input, conf))
            for (let s of this.from.apply(input, conf)) {
                if (s < 0) s += l.length
                for (let e of this.to.apply(input, conf)) {
                    if (e < 0) e += l.length
                    yield l.slice(s, e)
                }
            }
    }
    * paths(input, conf) {
        for (let l of this.lhs.paths(input, conf))
            for (let a of this.from.apply(input, conf))
                for (let b of this.to.apply(input, conf))
                    yield l.concat([{start:a, end:b}])
    }
    toString() {
        return this.lhs.toString() + '[' + this.from.toString() + ':' + this.to.toString() + ']'
    }
}
class GenericIndex extends ParseNode {
    constructor(innerNode) {
        super()
        this.index = innerNode
    }
    * apply(input, conf) {
        let t = nameType(input)
        if (t == 'null') return yield null;
        for (let i of this.index.apply(input, conf)) {
            if (t == 'array' && nameType(i) != 'number')
                throw 'Cannot index array with ' + nameType(i) + ' ' +
                    JSON.stringify(i)
            else if (t == 'object' && nameType(i) != 'string')
                throw 'Cannot index object with ' + nameType(i) + ' ' +
                    JSON.stringify(i)
            if (typeof i == 'number' && i < 0 && nameType(input) == 'array')
                yield input[input.length + i]
            else
                yield typeof input[i] == 'undefined' ? null : input[i]
        }
    }
    * paths(input, conf) {
        for (let a of this.index.apply(input, conf))
            yield [a]
    }
}
class IdentifierIndex extends GenericIndex {
    constructor(v) {
        super(new StringNode(v))
    }
    toString() {
        return '.' + this.index.value
    }
}
class GenericSlice extends ParseNode {
    constructor(fr, to) {
        super()
        this.from = fr
        this.to = to
    }
    * apply(input, conf) {
        for (let l of this.from.apply(input, conf)) {
            if (l < 0) l += input.length
            for (let r of this.to.apply(input, conf)) {
                if (r < 0)
                    r += input.length
                yield input.slice(l, r)
            }
        }
    }
    * paths(input, conf) {
        for (let l of this.from.apply(input, conf))
            for (let r of this.to.apply(input, conf))
                yield [{start: l, end: r}]
    }
    toString() {
        return '.[' + this.from.toString() + ':' + this.to.toString() + ']'
    }
}
class IdentityNode extends ParseNode {
    constructor() {
        super()
    }
    * apply(input, conf) {
        yield input
    }
    * paths(input, conf) {
        yield []
    }
    toString() {
        return '.'
    }
}
class ValueNode extends ParseNode {
    constructor(v) {
        super()
        this.value = v
    }
    * apply() {
        yield this.value
    }
    * paths(input, conf) {
        yield this.value
    }
    toString() {
        return JSON.stringify(this.value)
    }
}
class StringNode extends ValueNode {
    constructor(v) {
        super(v)
    }
}
class StringLiteral extends ParseNode {
    constructor(strings, interpolations) {
        super()
        this.strings = strings
        this.interpolations = interpolations
    }
    * apply(input, conf) {
        yield* this.applyEscape(input, formats.text, conf)
    }
    * applyEscape(input, esc, conf, startAt=0) {
        let s = this.strings[startAt]
        let i = this.interpolations[startAt]
        if (!i) return yield s
        for (let v of this.interpolations[startAt].apply(input, conf)) {
            for (let r of this.applyEscape(input, esc, conf, startAt + 1)) {
                yield s + esc(v) + r
            }
        }
    }
    toString() {
        let s = ''
        for (let i = 0; i < this.strings.length; i++) {
            s += this.strings[i].replace('\\', '\\\\').replace('"', '\\"')
            if (this.interpolations[i])
                s += '\\(' + this.interpolations[i].toString() + ')'
        }
        return '"' + s + '"'
    }
}
class NumberNode extends ValueNode {
    constructor(v) {
        super(v)
    }
    toString() {
        return this.value.toString()
    }
}
class BooleanNode extends ValueNode {
    constructor(v) {
        super(v)
    }
    toString() {
        return this.value ? 'true' : 'false'
    }
}
class SpecificValueIterator extends ParseNode {
    constructor(source) {
        super()
        this.source = source
        this.filter = new GenericValueIterator()
    }
    * apply(input, conf) {
        for (let o of this.source.apply(input, conf)) {
            if (!['array', 'object'].includes(nameType(o)))
                throw 'cannot iterate over ' + nameType(o)
            yield* Object.values(o)
        }
    }
    * paths(input, conf) {
        for (let [p, v] of this.zip(this.source.paths(input, conf),
                this.source.apply(input, conf))) {
                if (nameType(v) == 'array')
                    for (let i = 0; i < v.length; i++)
                        yield p.concat([i])
                else
                    for (let i of Object.keys(v)) {
                        yield p.concat([i])
                    }
        }
    }
    * zip(a, b) {
        let aa = a[Symbol.iterator]()
        let bb = b[Symbol.iterator]()
        let v1 = aa.next()
        let v2 = bb.next()
        while (!v1.done && !v2.done) {
            yield [v1.value, v2.value]
            v1 = aa.next()
            v2 = bb.next()
        }
    }
    toString() {
        return this.source.toString() + '[]'
    }
    trace = sourced_trace_helper
}
class GenericValueIterator extends ParseNode {
    constructor() {
        super()
    }
    * apply(input, conf) {
        if (!['array', 'object'].includes(nameType(input)))
            throw 'cannot iterate over ' + nameType(input)
        if (nameType(input) == 'array')
            yield* input
        else
            yield* Object.values(input)
    }
    * paths(input, conf) {
        if (nameType(input) == 'array')
            for (let i = 0; i < input.length; i++)
                yield [i]
        else
            for (let o of Object.keys(input))
                yield [o]
    }
    toString() {
        return '.[]'
    }
}
class CommaNode extends ParseNode {
    constructor(branches) {
        super()
        this.branches = branches
    }
    * apply(input, conf) {
        for (let b of this.branches)
            yield* b.apply(input, conf)
    }
    * paths(input, conf) {
        for (let b of this.branches)
            yield* b.paths(input, conf)
    }
    toString() {
        return this.branches.join(', ')
    }
}
class ArrayNode extends ParseNode {
    constructor(body) {
        super()
        this.body = body
    }
    * apply(input, conf) {
        yield Array.from(this.body.apply(input, conf))
    }
    toString() {
        return '[' + this.body + ']'
    }
}
class PipeNode extends ParseNode {
    constructor(lhs, rhs) {
        super()
        this.lhs = lhs
        this.rhs = rhs
        this.isPipe = true
    }
    toString() {
        return `${this.lhs} | ${this.rhs}`
    }
    * apply(input, conf) {
        for (let v of this.lhs.apply(input, conf))
            for (let q of this.rhs.apply(v, conf))
                yield q
    }
    * paths(input, conf) {
        for (let [p, v] of this.zip(this.lhs.paths(input, conf),
                this.lhs.apply(input, conf))) {
            for (let p2 of this.rhs.paths(v, conf)) {
                yield p.concat(p2)
            }
        }
    }
    * zip(a, b) {
        let aa = a[Symbol.iterator]()
        let bb = b[Symbol.iterator]()
        let v1 = aa.next()
        let v2 = bb.next()
        while (!v1.done && !v2.done) {
            yield [v1.value, v2.value]
            v1 = aa.next()
            v2 = bb.next()
        }
    }
    trace(input, conf, dest) {
        for (let v of this.lhs.apply(input, conf)) {
            let next = []
            let more = {}
            if (this.lhs instanceof VariableBinding)
                more.variableValue = conf.variables[this.lhs.name]
            dest.push({
                node: this.lhs,
                output: v,
                next,
                variables: JSON.parse(JSON.stringify(conf.variables)),
                ...more
            })
            this.rhs.trace(v, conf, next)
        }
    }
}
class ObjectNode extends ParseNode {
    constructor(fields) {
        super()
        this.fields = fields
    }
    * apply(input, conf) {
        let obj = {}
        let values = {}
        let keys = []
        for (let {key, value} of this.fields) {
            for (let k of key.apply(input, conf)) {
                keys.push(k)
                values[k] = []
                for (let v of value.apply(input, conf))
                    values[k].push(v)
            }
        }
        yield* this.helper(keys, values, 0, {})
    }
    * helper(keys, values, startAt, obj) {
        if (startAt >= keys.length) {
            yield Object.assign({}, obj)
            return
        }
        let k = keys[startAt]
        for (let v of values[k]) {
            obj[k] = v
            yield* this.helper(keys, values, startAt + 1, obj)
        }
    }
    toString() {
        return '{' + this.fields.map(({key, value}) => key.toString() + ': ' + value.toString()).join(', ') + '}'
    }
}
class RecursiveDescent extends ParseNode {
    constructor() {
        super()
    }
    * apply(input, conf) {
        yield* this.recurse(input)
    }
    * recurse(s) {
        yield s
        let t = nameType(s)
        if (t == 'array' || t == 'object')
            for (let v of Object.values(s))
                yield* this.recurse(v)
    }
    * paths(input, conf) {
        yield* this.recursePaths(input, [])
    }
    * recursePaths(s, prefix) {
        yield prefix
        let t = nameType(s)
        if (t == 'array')
            for (let i = 0; i < s.length; i++)
                yield* this.recursePaths(s[i], prefix.concat([i]))
        else if (t == 'object')
            for (let [k,v] of Object.entries(s))
                yield* this.recursePaths(v, prefix.concat([k]))
    }
    toString() {
        return '..'
    }
}
class OperatorNode extends ParseNode {
    constructor(l, r) {
        super()
        this.l = l
        this.r = r
    }
    * apply(input, conf) {
        for (let rr of this.r.apply(input, conf))
            for (let ll of this.l.apply(input, conf))
                yield this.combine(ll, rr, nameType(ll), nameType(rr))
    }
    trace(input, conf, dest) {
        for (let v of this.l.apply(input, conf)) {
            let next = []
            dest.push({
                node: this.l,
                output: v,
                next,
                subsidiary: 'left'
            })
            for (let v2 of this.r.apply(input, conf)) {
                let next2 = []
                next.push({
                    node: this.r,
                    output: v2,
                    next: next2,
                    subsidiary: 'right',
                })
                let result = this.combine(v, v2, nameType(v), nameType(v2))
                let next3 = []
                next2.push({
                    node: this,
                    output: result,
                    next: next3,
                })
            }
        }
    }
}
class AdditionOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        if (lt == 'number' && rt == 'number')
            return l + r
        if (l === null)
            return r
        if (r === null)
            return l
        if (lt == 'string' && rt == 'string')
            return l + r
        if (lt == 'array' && rt == 'array')
            return l.concat(r)
        if (lt == 'object' && rt == 'object')
            return Object.assign(Object.assign({}, l), r)
        throw 'type mismatch in +:' + lt + ' and ' + rt + ' cannot be added'
    }
    toString() {
        return this.l + ' + ' + this.r
    }
}
class MultiplicationOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        if (lt == 'number' && rt == 'number')
            return l * r
        if (lt == 'number' && rt == 'string')
            return this.repeat(r, l)
        if (lt == 'string' && rt == 'number')
            return this.repeat(l, r)
        if (lt == 'object' && rt == 'object')
            return this.merge(Object.assign({}, l), r)
        throw 'type mismatch in *:' + lt + ' and ' + rt + ' cannot be multiplied'
    }
    repeat(s, n) {
        if (n == 0)
            return null;
        let r = []
        for (let i = 0; i < n; i++)
            r.push(s)
        return r.join('')
    }
    merge(l, r) {
        for (let k of Object.keys(r)) {
            if (!l.hasOwnProperty(k))
                l[k] = r[k]
            else if (nameType(l[k]) != 'object' || nameType(r[k]) != 'object')
                l[k] = r[k]
            else
                this.merge(l[k], r[k])
        }
        return l
    }
    toString() {
        return this.l + ' * ' + this.r
    }
}
class SubtractionOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        if (lt == 'number' && rt == 'number')
            return l - r
        if (l == null || r == null)
            throw 'type mismatch in -'
        if (lt == 'array' && rt == 'array')
            return l.filter(x => r.indexOf(x) == -1)
        throw 'type mismatch in -:' + lt + ' and ' + rt + ' cannot be subtracted'
    }
    toString() {
        return this.l + ' - ' + this.r
    }
}
class DivisionOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        if (lt == 'number' && rt == 'number')
            return l / r
        if (lt == 'string' && rt == 'string')
            return l.split(r)
        throw 'type mismatch in -:' + lt + ' and ' + rt + ' cannot be divided'
    }
    toString() {
        return this.l + ' / ' + this.r
    }
}
class ModuloOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        if (lt == 'number' && rt == 'number')
            return l % r
        throw 'type mismatch in -:' + lt + ' and ' + rt + ' cannot be divided (remainder)'
    }
    toString() {
        return this.l + ' % ' + this.r
    }
}
class LessThanOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        return compareValues(l, r) < 0
    }
    toString() {
        return this.l + ' < ' + this.r
    }
}
class GreaterThanOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        return compareValues(l, r) > 0
    }
    toString() {
        return this.l + ' > ' + this.r
    }
}
class LessEqualsOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        return compareValues(l, r) <= 0
    }
    toString() {
        return this.l + ' <= ' + this.r
    }
}
class GreaterEqualsOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        return compareValues(l, r) >= 0
    }
    toString() {
        return this.l + ' >= ' + this.r
    }
}
class AndOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        return l !== false && l !== null && r !== false && r !== null
    }
    toString() {
        return this.l + ' and ' + this.r
    }
}
class OrOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        return (l !== false && l !== null) || (r !== false && r !== null)
    }
    toString() {
        return this.l + ' and ' + this.r
    }
}
class EqualsOperator extends OperatorNode {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        if (lt != rt)
            return false
        if (lt == 'number' || lt == 'string' || lt == 'boolean' || lt == 'null')
            return l == r
        if (lt == 'array') {
            if (l.length != r.length)
                return false
            for (let i = 0; i < l.length; i++)
                if (!this.combine(l[i], r[i], nameType(l[i]), nameType(r[i])))
                    return false
            return true
        }
        let lk = Object.keys(l)
        let rk = Object.keys(r)
        if (lk.length != rk.length)
            return false
        for (let k of lk) {
            if (!r.hasOwnProperty(k))
                return false
            if (!this.combine(l[k], r[k], nameType(l[k]), nameType(r[k])))
                return false
        }
        return true
    }
    toString() {
        return this.l + ' == ' + this.r
    }
}
class NotEqualsOperator extends EqualsOperator {
    constructor(l, r) {
        super(l, r)
    }
    combine(l, r, lt, rt) {
        return !super.combine(l, r, lt, rt)
    }
    toString() {
        return this.l + ' != ' + this.r
    }
}
class AlternativeOperator extends ParseNode {
    constructor(l, r) {
        super()
        this.lhs = l
        this.rhs = r
    }
    * apply(input, conf) {
        let found = false
        for (let v of this.lhs.apply(input, conf)) {
            if (v !== null) found = true
            yield v
        }
        if (!found)
            yield* this.rhs.apply(input, conf)
    }
    toString() {
        return this.l + ' // ' + this.r
    }
}
class UpdateAssignment extends ParseNode {
    constructor(l, r) {
        super()
        this.l = l
        this.r = r
    }
    * apply(input, conf) {
        input = JSON.parse(JSON.stringify(input))
        for (let p of this.l.paths(input, conf)) {
            let it = this.r.apply(this.get(input, p), conf).next()
            if (it.done)
                input = this.update(input, p, null, true)
            else
                input = this.update(input, p, it.value)
        }
        yield input
    }
    // Pluck the value at a path out of an object
    get(obj, p) {
        let o = obj
        for (let i of p) {
            if (o === null) return null;
            o = o[i]
        }
        return o
    }
    // Set the value at path p to v in obj,
    // or delete the key if del is true.
    update(obj, p, v, del=false) {
        if (obj === null && !del)
            obj = {}
        else if (obj === null)
            return obj;
        let o = obj
        let last = p.pop()
        for (let i of p)
            o = o[i]
        if (typeof last == 'undefined')
            return v
        o[last] = v
        if (del)
            delete o[last]
        return obj
    }
    toString() {
        return this.l + ' |= ' + this.r
    }
}
class PlainAssignment extends ParseNode {
    constructor(l, r) {
        super()
        this.l = l
        this.r = r
    }
    * apply(input, conf) {
        for (let it of this.r.apply(input, conf)) {
            let innerInput = JSON.parse(JSON.stringify(input))
            for (let p of this.l.paths(innerInput, conf)) {
                innerInput = this.update(innerInput, p, it)
            }
            yield innerInput
        }
    }
    // Set the value at path p to v in obj
    update(obj, p, v) {
        if (obj === null)
            obj = {}
        let o = obj
        let last = p.pop()
        for (let i of p) {
            if (!(i in o)) {
                o[i] = {}
                o = o[i]
            } else
                o = o[i]
        }
        if (typeof last == 'undefined')
            return v
        o[last] = v
        return obj
    }
    toString() {
        return this.l + ' = ' + this.r
    }
}
class FunctionCall extends ParseNode {
    constructor(fname, args) {
        super()
        this.name = fname
        this.args = args
    }
    apply(input, conf) {
        let func
        let ufa = conf.userFuncArgs[this.name]
        if (ufa)
            func = function(input, conf, args) {
                return ufa.apply(input, conf)
            }
        else if (!func)
            func = functions[this.name]
        if (!func)
            throw 'no such function ' + this.name
        let argStack = []
        return func(input, conf, this.args)
    }
    paths(input, conf) {
        let ufa = conf.userFuncArgs[this.name]
        if (ufa)
            return ufa.paths(input, conf)
        let func = functions[this.name + '-paths']
        if (!func)
            throw 'no paths for ' + this.name
        return func(input, conf, this.args)
    }
    trace(input, conf, dest) {
        if (this.args.length == 1 && !conf.userFuncArgs[this.name] && this.ordinary) {
            let func = functions[this.name];
            if (func.params && func.params.length > 0) {
                if (func.params[0].mode == 'defer') {
                    return super.trace(input, conf, dest)
                }
            }
            for (let a1 of this.args[0].apply(input, conf)) {
                let next = []
                let paramLabel = 'arg1'
                if (func.params && func.params.length > 0 && func.params[0].label)
                    paramLabel = func.params[0].label;
                dest.push({
                    node: this.args[0],
                    output: a1,
                    next,
                    subsidiary: paramLabel
                })
                for (let result of func(input, conf, [new ValueYielder(a1)])) {
                    let next2 = []
                    next.push({
                        node: this,
                        output: result,
                        next: next2,
                    })
                }
            }    
        } else {
            return super.trace(input, conf, dest)
        }
    }
    get ordinary() {
        let func = functions[this.name];
        if (!func) return true;
        if (func.params && func.params.length > 0) {
            if (func.params[0].mode == 'defer') {
                return false;
            }
        }
        return true;
    }
    toString() {
        if (this.args.length == 0)
            return this.name.replace(/\/.*$/, '')
        else
            return this.name.replace(/\/.*$/, '') + '(' + this.args.join('; ') + ')'
    }
}
class FormatNode extends ParseNode {
    constructor(fname, quote) {
        super()
        this.name = fname
        this.string = quote
    }
    * apply(input, conf) {
        if (typeof this.string === 'undefined')
            return yield formats[this.name](input)
        yield* this.string.applyEscape(input, formats[this.name], conf)
    }
    toString() {
        if (this.string)
            return '@' + this.name + ' ' + this.string
        else
            return '@' + this.name
    }
}
class ErrorSuppression extends ParseNode {
    constructor(inner) {
        super()
        this.inner = inner
    }
    * apply(input, conf) {
        try {
            for (let o of this.inner.apply(input, conf))
                if (o !== null)
                    yield o
        } catch {
        }
    }
    * paths(input, conf) {
        try {
            for (let [o,p] of zip(this.inner.apply(input, conf),
                    this.inner.paths(input, conf)))
                if (o !== null)
                    yield p
        } catch {
        }
    }
    toString() {
        return this.inner + '?'
    }
}
class VariableBinding extends ParseNode {
    constructor(lhs, name) {
        super()
        this.value = lhs
        this.name = name
    }
    * apply(input, conf) {
        for (let v of this.value.apply(input, conf)) {
            conf.variables[this.name] = v
            yield input
        }
        delete conf.variables[this.name]
    }
    toString() {
        return this.value + ' as $' + this.name
    }
}
class VariableReference extends ParseNode {
    constructor(name) {
        super()
        this.name = name
    }
    * apply(input, conf) {
        yield conf.variables[this.name]
    }
    toString() {
        return '$' + this.name
    }
}
class ReduceNode extends ParseNode {
    constructor(generator, name, init, expr) {
        super()
        this.generator = generator
        this.name = name
        this.init = init
        this.expr = expr
    }
    * apply(input, conf) {
        // This uses all values of the initialiser, but only the
        // last value of the reduction expression is retained. This
        // seems to match jq proper's behaviour, but jq has odd
        // errors in mixed cases that seem unnecessary.
        for (let accum of this.init.apply(input, conf)) {
            for (let v of this.generator.apply(input, conf)) {
                conf.variables[this.name] = v
                for (let a of this.expr.apply(accum, conf))
                    accum = a
            }
            delete conf.variables[this.name]
            yield accum
        }
    }
    toString() {
        return 'reduce ' + this.generator + ' as $' + this.name + '(' + this.init + '; ' + this.expr + ')'
    }
}
class ForeachNode extends ParseNode {
    constructor(generator, name, init, update, extract) {
        super()
        this.generator = generator
        this.name = name
        this.init = init
        this.update = update
        this.extract = extract
    }
    * apply(input, conf) {
        for (let accum of this.init.apply(input, conf)) {
            for (let v of this.generator.apply(input, conf)) {
                conf.variables[this.name] = v
                for (let a of this.update.apply(accum, conf))
                    accum = a
                for (let e of this.extract.apply(accum, conf))
                    yield e;
            }
            delete conf.variables[this.name]
        }
    }
    toString() {
        return 'foreach ' + this.generator + ' as $' + this.name + '(' + this.init + '; ' + this.update + (this.extract ? '; ' + this.extract : '') + ')'
    }
}
class IfNode extends ParseNode {
    constructor(conditions, thens, elseBranch) {
        super()
        this.conditions = conditions
        this.thens = thens
        this.elseBranch = elseBranch
    }
    * apply(input, conf) {
        for (let [c,t] of zip(this.conditions, this.thens)) {
            for (let cond of c.apply(input, conf)) {
                if (cond) {
                    for (let o of t.apply(input, conf))
                        yield o
                    return
                }
            }
        }
        if (this.elseBranch) {
            yield* this.elseBranch.apply(input, conf)
            return
        }
        yield input
    }
    toString() {
        let s = ''
        for (let [c,t] of zip(this.conditions, this.thens))
            s += 'if ' + c + ' then ' + t + ' el'
        if (this.elseBranch) {
            return s + 'se ' + this.elseBranch + ' end'
        }
        return s.slice(0, -2) + 'end'
    }
}

class ValueYielder {
    /* This is used internally for evaluating functions at specific values. */
    constructor(v) {
        this.value = v
    }
    * apply(input, conf) {
        yield this.value
    }
    toString() {
        return this.value.toString()
    }
}

const formats = {
    text(v) {
        if (typeof v == 'string')
            return v
        return prettyPrint(v, '', '', '')
    },
    json(v) {
        return prettyPrint(v, '', '', '')
    },
    html(v) {
        if (typeof v != 'string')
            v = prettyPrint(v, '', '', '')
        return v.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(
            /&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;')
    },
    uri(v) {
        if (typeof v != 'string')
            v = prettyPrint(v, '', '', '')
        return encodeURIComponent(v)
    },
    urid(v) {
        if (typeof v != 'string')
            v = prettyPrint(v, '', '', '')
        return decodeURIComponent(v)
    },
    csv(v) {
        if (nameType(v) != 'array')
            throw 'cannot csv-format ' + nameType(v) + ', only array'
        return v.map(x => {
            if (typeof x == 'string')
                return '"' + x.replace(/"/g, '""') + '"'
            else if (typeof x == 'number')
                return '' + x
            else if (x === null)
                return ''
            else
                throw 'type ' + nameType(x) + ' not valid in a csv row'
        }).join(',')
    },
    tsv(v) {
        if (nameType(v) != 'array')
            throw 'cannot tsv-format ' + nameType(v) + ', only array'
        return v.map(x => {
            if (typeof x == 'string')
                return escapeString(x)
            else if (typeof x == 'number')
                return '' + x
            else if (x === null)
                return ''
            else
                throw 'type ' + nameType(x) + ' not valid in a tsv row'
        }).join('\t')
    },
    base64(v) {
        if (typeof v != 'string')
            v = prettyPrint(v, '', '', '')
        return btoa(v)
    },
    base64d(v) {
        if (typeof v != 'string')
            throw 'can only base64-decode strings'
        return atob(v)
    },
    sh(v) {
        let t = nameType(v)
        if (t == 'string')
            return "'" + t.replace(/'/g, "'\\''") + "'"
        else if (t == 'number')
            return '' + v
        else if (t == 'boolean')
            return '' + v
        else if (v === null)
            return 'null'
        else if (t === 'array') {
            return v.map(v => {
                let t = nameType(v)
                if (t == 'string')
                    return "'" + v.replace(/'/g, "'\\''") + "'"
                else if (t == 'number')
                    return '' + v
                else if (t == 'boolean')
                    return '' + v
                else if (v === null)
                    return 'null'
                else
                    throw t + ' cannot be escaped for shell'
            }).join(' ')
        } else
            throw t + ' cannot be escaped for shell'
    },
}

const functions = {
    'tostring/0': function*(input) {
        yield formats.text(input)
    },
    'empty/0': function*(input) {
    },
    'fromjson/0': function*(input) {
        yield JSON.parse(input)
    },
    'path/1': Object.assign(function*(input, conf, args) {
        let f = args[0]
        yield* f.paths(input, conf)
    }, {params: [{mode: 'defer'}]}),
    'select/1': Object.assign(function*(input, conf, args) {
        let selector = args[0]
        for (let b of selector.apply(input, conf))
            if (b !== false && b !== null)
                yield input
    }, {
        params: [{label: 'predicate', mode: 'eval'}]
    }),
    'select/1-paths': function*(input, conf, args) {
        let selector = args[0]
        for (let b of selector.apply(input, conf))
            if (b !== false && b !== null)
                yield []
    },
    'length/0': function*(input) {
        let t = nameType(input)
        if (t == 'string' || t == 'array')
            return yield input.length
        if (t == 'null') return yield 0
        if (t == 'object') return yield Object.keys(input).length
        throw 'cannot compute length of ' + t
    },
    'keys/0': function*(input) {
        yield* Object.keys(input).sort()
    },
    'has/1': Object.assign(function*(input, conf, args) {
        let f = args[0]
        for (let k of f.apply(input, conf))
            yield input.hasOwnProperty(k)
    }, {params: [{label: 'key'}]}),
    'has/1-paths': function*(input, conf, args) {
        let f = args[0]
        for (let k of f.apply(input, conf))
            if (input.hasOwnProperty(k)) yield []
    },
    'in/1': Object.assign(function*(input, conf, args) {
        let f = args[0]
        for (let o of f.apply(input, conf))
            yield o.hasOwnProperty(input)
    }, {params: [{label: 'object'}]}),
    'in/1-paths': function*(input, conf, args) {
        let f = args[0]
        for (let o of f.apply(input, conf))
            if (o.hasOwnProperty(input)) yield []
    },
    'contains/1': Object.assign(function*(input, conf, args) {
        let f = args[0]
        let t = nameType(input)
        for (let o of f.apply(input, conf)) {
            let ot = nameType(o)
            if (t != ot) {
                throw t + ' and ' + ot + ' cannot have their containment checked'
            } else
                yield containsHelper(input, o)
        }
    }, {params: [{label: 'element'}]}),
    'inside/1': Object.assign(function*(input, conf, args) {
        let f = args[0]
        let t = nameType(input)
        for (let o of f.apply(input, conf)) {
            let ot = nameType(o)
            if (t != ot) {
                throw t + ' and ' + ot + ' cannot have their containment checked'
            } else
                yield containsHelper(o, input)
        }
    }, {params: [{label: 'container'}]}),
    'to_entries/0': function*(input, conf) {
        let t = nameType(input)
        if (t == 'array') {
            let ret = []
            for (let i = 0; i < input.length; i++)
                ret.push({key: i, value: input[i]})
            yield ret
        } else if (t == 'object')
            yield Object.entries(input).map(a => ({key: a[0], value: a[1]}))
        else
            throw 'cannot make entries from ' + t
    },
    'from_entries/0': function*(input, conf) {
        let t = nameType(input)
        if (t == 'array') {
            let obj = {}
            for (let {key, value} of input)
                obj[key] = value
            yield obj
        } else
            throw 'cannot use entries from ' + t
    },
    'type/0': function*(input) {
        yield nameType(input)
    },
    'range/1': Object.assign(function*(input, conf, args) {
        for (let m of args[0].apply(input, conf))
            for (let i = 0; i < m; i++)
                yield i
    }, {params: [{mode: 'defer'}]}),
    'range/2': function*(input, conf, args) {
        for (let min of args[0].apply(input, conf))
            for (let max of args[1].apply(input, conf))
                for (let i = min; i < max; i++)
                    yield i
    },
    'range/3': function*(input, conf, args) {
        for (let min of args[0].apply(input, conf))
            for (let max of args[1].apply(input, conf))
                for (let step of args[2].apply(input, conf))
                    for (let i = min; i < max; i+=step)
                        yield i
    },
    'any/0': function*(input, conf) {
        if (nameType(input) != 'array')
            throw 'any/0 requires array as input, not ' + nameType(input)
        for (let b of input)
            if (b) return yield true
        yield false
    },
    'any/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'array')
            throw 'any/1 requires array as input, not ' + nameType(input)
        for (let v of input)
            for (let b of args[0].apply(v, conf))
                if (b) return yield true
        yield false
    }, {params: [{mode: 'defer'}]}),
    'any/2': function*(input, conf, args) {
        let gen = args[0]
        let cond = args[1]
        for (let v of gen.apply(input, conf))
            for (let b of cond.apply(v, conf))
                if (b) return yield true
        yield false
    },
    'all/0': function*(input, conf) {
        if (nameType(input) != 'array')
            throw 'all/0 requires array as input, not ' + nameType(input)
        for (let b of input)
            if (!b) return yield false
        yield true
    },
    'all/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'array')
            throw 'all/1 requires array as input, not ' + nameType(input)
        for (let v of input)
            for (let b of args[0].apply(v, conf))
                if (!b) return yield false
        yield true
    }, {params: [{mode: 'defer'}]}),
    'all/2': function*(input, conf, args) {
        let gen = args[0]
        let cond = args[1]
        for (let v of gen.apply(input, conf))
            for (let b of cond.apply(v, conf))
                if (!b) return yield false
        yield true
    },
    'add/0': function*(input, conf) {
        if (nameType(input) != 'array')
            throw 'can only add up arrays'
        if (input.length == 0) return yield null
        if (input.length == 1) return yield input[0]
        let ret = AdditionOperator.prototype.combine(input[0], input[1],
            nameType(input[0]), nameType(input[1]))
        for (let i = 2; i < input.length; i++)
            ret = AdditionOperator.prototype.combine(ret, input[i],
                nameType(ret), nameType(input[i]))
        yield ret
    },
    'add/1': Object.assign(function*(input, conf, args) {
        let sum = null;
        for (let addend of args[0].apply(input, conf)) {
            sum = AdditionOperator.prototype.combine(sum, addend,
                nameType(sum), nameType(addend))
        }
        yield sum
    }, {params: [{label: 'source'}]}),
    'tonumber/0': function*(input) {
        yield Number.parseFloat(input)
    },
    'toboolean/0': function*(input) {
        if (input === "false" || input === false)
            yield false;
        else if (input === "true" || input === true)
            yield true;
        else
            throw `cannot convert ${nameType(input)} (${prettyPrint(input)}) to boolean`;
    },
    'tojson/0': function*(input) {
        yield JSON.stringify(input);
    },
    'fromjson/0': function*(input) {
        yield JSON.parse(input);
    },
    'reverse/0': function*(input) {
        if (nameType(input) != 'array')
            throw 'can only reverse arrays, not ' + nameType(input)
        yield input.toReversed()
    },
    'sort/0': function*(input, conf) {
        if (nameType(input) != 'array')
            throw 'can only sort arrays, not ' + nameType(input)
        let r = Array.from(input)
        yield r.sort(compareValues)
    },
    'sort_by/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'array')
            throw 'can only sort arrays, not ' + nameType(input)
        let key = args[0]
        let r = input.map(v => ({
            key: key.apply(v, conf).next().value,
            value: v
        }))
        r.sort((a, b) => compareValues(a.key, b.key))
        yield r.map(a => a.value)
    }, {params: [{mode: 'defer'}]}),
    'group_by/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'array')
            throw 'group_by/1 requires array as input, not ' + nameType(input)
        let key = args[0]
        // Map input items to {key, value} pairs using the provided filter
        let r = input.map(v => ({
            key: Array.from(key.apply(v, conf)),
            value: v
        }))
        // Sort by the calculated key using jq's comparison logic
        r.sort((a, b) => compareValues(a.key, b.key))
        // Group adjacent items with identical keys
        let ret = []
        if (r.length > 0) {
            let currentGroup = [r[0].value]
            let currentKey = r[0].key
            for (let i = 1; i < r.length; i++) {
                if (compareValues(r[i].key, currentKey) === 0) {
                    currentGroup.push(r[i].value)
                } else {
                    ret.push(currentGroup)
                    currentGroup = [r[i].value]
                    currentKey = r[i].key
                }
            }
            ret.push(currentGroup)
        }
        yield ret
    }, {params: [{mode: 'defer'}]}),
    'explode/0': function*(input, conf) {
        if (nameType(input) != 'string')
            throw 'can only explode string, not ' + nameType(input)
        let ret = []
        for (let i = 0; i < input.length; i++) {
            let c = input.charCodeAt(i)
            ret.push(c)
            if (c > 0xffff)
                i++
        }
        yield ret
    },
    'implode/0': function*(input, conf) {
        if (nameType(input) != 'array')
            throw 'can only implode array, not ' + nameType(input)
        yield input.map(x => String.fromCodePoint(x)).join('')
    },
    'split/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'string')
            throw 'can only split string, not ' + nameType(input)
        for (let s of args[0].apply(input, conf)) {
            yield input.split(s)
        }
    }, {params: [{label: 'separator'}]}),
    'split/2': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'string')
            throw 'can only split string, not ' + nameType(input)
        let flags = args[1] ? args[1].apply(input, conf).next().value : '';
        flags = makeFlagString(flags);
        for (let regex of args[0].apply(input, conf)) {
            let re = new RegExp(regex, flags);
            yield input.split(re);
        }
    }, {params: [{label: 'regex'}, {label: 'flags'}]}),
    'splits/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'string')
            throw 'can only split string, not ' + nameType(input)
        for (let regex of args[0].apply(input, conf)) {
            let re = new RegExp(regex, 'u');
            yield* input.split(re);
        }
    }, {params: [{label: 'regex'}, {label: 'flags'}]}),
    'splits/2': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'string')
            throw 'can only split string, not ' + nameType(input)
        let flags = args[1] ? args[1].apply(input, conf).next().value : '';
        flags = makeFlagString(flags);
        for (let regex of args[0].apply(input, conf)) {
            let re = new RegExp(regex, flags);
            yield* input.split(re);
        }
    }, {params: [{label: 'regex'}, {label: 'flags'}]}),
    'join/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'array')
            throw 'can only join array, not ' + nameType(input)
        let a = input.map(x => {
            if (typeof x == 'number') return '' + x
            if (typeof x == 'string') return x
            if (typeof x == 'boolean') return '' + x
            if (x === null) return ''
            throw 'cannot join ' + nameType(x)
        })
        for (let s of args[0].apply(input, conf))
            yield a.join(s)
    }, {params: [{label: 'delimiter'}]}),
    'getpath/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'object' && nameType(input) != 'array')
            throw 'can only get path from objects and arrays, not ' + nameType(input)
        for (let path of args[0].apply(input, conf)) {
            let obj = input;
            for (let key of path) {
                if (obj.hasOwnProperty(key)) {
                    obj = obj[key];
                } else {
                    obj = null;
                    break;
                }
            }
            yield obj;
        }
    }, {params: [{label: 'paths'}]}),
    'setpath/2': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'object' && nameType(input) != 'array' && nameType(input) != 'null')
            throw 'can only set path on objects and arrays, not ' + nameType(input)
        for (let path of args[0].apply(input, conf)) {
            let obj = JSON.parse(JSON.stringify(input));
            let current = obj;
            for (let key of path.slice(0, -1)) {
                if (obj === null) {
                    if (nameType(key) == 'number') {
                        obj = [];
                        current = obj;
                    } else {
                        obj = {};
                        current = obj;
                    }
                } else if (!current.hasOwnProperty(key)) {
                    if (nameType(key) == 'number')
                        current[key] = [];
                    else
                        current[key] = {};
                }
                current = current[key];
            }
            for (let val of args[1].apply(input, conf)) {
                let key = path[path.length - 1];
                if (obj === null) {
                    if (nameType(key) == 'number') {
                        obj = [];
                        current = obj;
                    } else {
                        obj = {};
                        current = obj;
                    }
                } else if (!current.hasOwnProperty(key)) {
                    if (nameType(key) == 'number')
                        current = [];
                    else
                        current = {};
                }
                current[key] = val;
            }
            yield obj;
        }
    }, {params: [{label: 'paths'}, {label: 'value'}]}),
    'delpaths/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'object' && nameType(input) != 'array')
            throw 'can only delete paths from objects and arrays, not ' + nameType(input)
        for (let paths of args[0].apply(input, conf)) {
            let obj = JSON.parse(JSON.stringify(input));
            for (let path of paths) {
                let current = obj;
                for (let key of path.slice(0, -1)) {
                    if (!current.hasOwnProperty(key)) {
                        current[key] = {};
                    }
                    current = current[key];
                }
                delete current[path[path.length - 1]];
            }
            yield obj;
        }
    }, {params: [{label: 'paths'}]}),
    'ltrim/0': Object.assign(function*(input, conf) {
        if (nameType(input) != 'string')
            throw 'can only trim strings, not ' + nameType(input)
        yield input.trimLeft();
    }, {params: []}),
    'rtrim/0': Object.assign(function*(input, conf) {
        if (nameType(input) != 'string')
            throw 'can only trim strings, not ' + nameType(input)
        yield input.trimRight();
    }, {params: []}),
    'trim/0': Object.assign(function*(input, conf) {
        if (nameType(input) != 'string')
            throw 'can only trim strings, not ' + nameType(input)
        yield input.trim();
    }, {params: []}),
    'trimstr/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'string')
            throw 'can only trim strings, not ' + nameType(input)
        for (let s of args[0].apply(input, conf)) {
            let str = input;
            if (str.startsWith(s)) {
                str = str.slice(s.length);
            }
            if (str.endsWith(s)) {
                str = str.slice(0, -s.length);
            }
            yield str;
        }
    }, {params: [{label: 'str'}]}),
    'ltrimstr/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'string')
            throw 'can only trim strings, not ' + nameType(input)
        for (let s of args[0].apply(input, conf)) {
            let str = input;
            if (str.startsWith(s)) {
                str = str.slice(s.length);
            }
            yield str;
        }
    }, {params: [{label: 'str'}]}),
    'rtrimstr/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'string')
            throw 'can only trim strings, not ' + nameType(input)
        for (let s of args[0].apply(input, conf)) {
            let str = input;
            if (str.endsWith(s)) {
                str = str.slice(0, -s.length);
            }
            yield str;
        }
    }, {params: [{label: 'str'}]}),
    'first/0': function*(input, conf) {
        if (nameType(input) != 'array')
            throw 'can only get first element of arrays, not ' + nameType(input)
        if (input.length == 0) return yield null
        yield input[0];
    },
    'last/0': Object.assign(function*(input, conf) {
        if (nameType(input) != 'array')
            throw 'can only get last element of arrays, not ' + nameType(input)
        if (input.length == 0) return yield null
        yield input[input.length - 1];
    }, {params: []}),
    'nth/1': Object.assign(function*(input, conf, args) {
        if (nameType(input) != 'array')
            throw 'can only get nth element of arrays, not ' + nameType(input)
        if (input.length == 0) return yield null
        for (let n of args[0].apply(input, conf)) {
            if (nameType(n) != 'number')
                throw 'nth index must be a number, not ' + nameType(n)
            if (n < 0)
                throw 'negative indices not supported for nth'
            yield input[n];
        }
    }, {params: [{label: 'index'}]}),
    'nth/2': Object.assign(function*(input, conf, args) {
        for (let n of args[0].apply(input, conf)) {
            if (nameType(n) != 'number')
                throw 'nth index must be a number, not ' + nameType(n)
            if (n < 0)
                throw 'negative indices not supported for nth'
            let index = 0;
            for (let item of args[1].apply(input, conf)) {
                index++;
                if (index <= n) continue;
                yield item;
                break;
            }
        }
    }, {params: [{label: 'index'}, {label: 'expr', mode: 'defer'}]}),
    'first/1': Object.assign(function*(input, conf, args) {
        for (let n of args[0].apply(input, conf)) {
            return yield n;
        }
    }, {params: [{label: 'generator'}]}),
    'last/1': Object.assign(function*(input, conf, args) {
        let last = null
        for (let n of args[0].apply(input, conf)) {
            last = n;
        }
        yield last;
    }, {params: [{label: 'generator'}]}),
    'isempty/1': function*(input, conf, args) {
        for (let item of args[0].apply(input, conf))
            return yield false;
        return yield true;
    },
    'limit/2': Object.assign(function*(input, conf, args) {
        for (let n of args[0].apply(input, conf)) {
            let count = 0;
            for (let val of args[1].apply(input, conf)) {
                if (count >= n)
                    break;
                yield val;
                count++;
            }
        }
    }, {params: [{label: 'n'}, {label: 'expr'}]}),
    'skip/2': Object.assign(function*(input, conf, args) {
        for (let n of args[0].apply(input, conf)) {
            let count = 0;
            for (let val of args[1].apply(input, conf)) {
                if (count >= n) {
                    yield val;
                }
                count++;
            }
        }
    }, {params: [{label: 'n'}, {label: 'expr'}]}),
    'walk/1': Object.assign(function*(input, conf, args) {
        yield* walk(input, conf, args[0])
    }, {params: [{label: 'generator'}]}),
    'ascii_upcase/0': function*(input, conf) {
        if (nameType(input) != 'string')
            throw 'can only convert strings to uppercase, not ' + nameType(input)
        yield input.replace(/./g, (x) => { if (x.charCodeAt(0) >= 97 && x.charCodeAt(0) <= 122) return x.toUpperCase(); return x; });
    },
    'ascii_downcase/0': function*(input, conf) {
        if (nameType(input) != 'string')
            throw 'can only convert strings to lowercase, not ' + nameType(input)
        yield input.replace(/./g, (x) => { if (x.charCodeAt(0) >= 65 && x.charCodeAt(0) <= 90) return x.toLowerCase(); return x; });
    },
    'sub/2': Object.assign(function*(input, conf, args) {
        yield* sub(input, conf, args[0], args[1]);
    }, {params: [{label: 'regex'}, {label: 'tostring'}]}),
    'sub/3': Object.assign(function*(input, conf, args) {
        let flags = args[2].apply(input, conf).next().value || '';
        yield* sub(input, conf, args[0], args[1], flags);
    }, {params: [{label: 'regex'}, {label: 'tostring'}, {label: 'flags'}]}),
    'gsub/2': Object.assign(function*(input, conf, args) {
        return yield* sub(input, conf, args[0], args[1], 'g')
    }, {params: [{label: 'regex'}, {label: 'tostring'}]}),
    'gsub/3': Object.assign(function*(input, conf, args) {
        let flags = args[2].apply(input, conf).next().value || 'g';
        yield* sub(input, conf, args[0], args[1], flags);
    }, {params: [{label: 'regex'}, {label: 'tostring'}, {label: 'flags'}]}),
    'test/1': Object.assign(function*(input, conf, args) {
        for (let regexp of args[0].apply(input, conf)) {
            let re = new RegExp(regexp, "u");
            yield re.test(input);
        }
    }, {params: [{label: 'regex'}]}),
    'test/2': Object.assign(function*(input, conf, args) {
        let flags = args[0].apply(input, conf).next().value || '';
        for (let regexp of args[0].apply(input, conf)) {
            let re = new RegExp(regexp, makeFlagString(flags));
            yield re.test(input);
        }
    }, {params: [{label: 'regex'}, {label: 'flags'}]}),
    'capture/1': Object.assign(function*(input, conf, args) {
        for (let regexp of args[0].apply(input, conf)) {
            let re = new RegExp(regexp, "u");
            let match = re.exec(input);
            if (match) {
                yield match.groups;
            }
        }
    }, {params: [{label: 'regex'}]}),
    'capture/2': Object.assign(function*(input, conf, args) {
        let flags = args[1].apply(input, conf).next().value || '';
        flags = makeFlagString(flags);
        for (let regexp of args[0].apply(input, conf)) {
            let re = new RegExp(regexp, flags);
            let match = re.exec(input);
            if (match) {
                yield match.groups;
            }
        }
    }, {params: [{label: 'regex'}, {label: 'flags'}]}),
    'match/1': Object.assign(function*(input, conf, args) {
        let flags = 'u';
        if (args[1]) {
            flags = makeFlagString(args[1].apply(input, conf).next().value || '');
        }
        flags += 'd';
        let global = flags.indexOf('g') >= 0;
        let steps = 0;
        for (let regexp of args[0].apply(input, conf)) {
            let re = new RegExp(regexp, flags);
            let match = re.exec(input);
            while (match) {
                let result = {
                    offset: match.index,
                    length: match[0].length,
                    string: match[0],
                    captures: []
                };
                for (let i = 1; i < match.length; i++) {
                    if (!match.indices[i])
                        continue;
                    let name = null;
                    if (match.indices.groups) {
                        for (let [k,v] of Object.entries(match.indices.groups)) {
                            if (match.indices[i][0] == v[0] && match.indices[i][1] == v[1]) {
                                name = k;
                                break;
                            }
                        }
                    }
                    result.captures.push({
                        offset: match.indices[i][0],
                        length: match[i].length,
                        string: match[i],
                        name: name,
                    });
                }
                yield result;
                match = re.exec(input);
                if (steps++ > 1000 || !global)
                    break;
            }
        }
    }, {params: [{label: 'regex'}]}),
    'scan/2': function*(input, conf, args) {
        for (let re of args[0].apply(input, conf)) {
            for (let flags of args[1].apply(input, conf)) {
                if (flags.includes('g')) flags = flags.gsub('g', '');
                flags = makeFlagString(flags)
                let regexp = new RegExp(re, flags + 'g');
                let match;
                while (null !== (match = regexp.exec(input))) {
                    console.log(match)
                    if (match.length > 1)
                        yield match.slice(1);
                    else yield match[0];
                }
            }
        }
    },
    'recurse/2': function*(input, conf, args) {
        let gen = args[0];
        let cond = args[1];
        yield input;
        let results = Array.from(gen.apply(input, conf));
        let stepCount = 0;
        while (results.length) {
            if (stepCount++ > 100000) break;
            let item = results.shift();
            for (let r of cond.apply(item, conf)) {
                if (r !== false && r !== null) {
                    yield item;
                    results.unshift(...gen.apply(item, conf));
                }
            }
        }
    },
    'unique/0': function*(input) {
        if (nameType(input) != 'array')
            throw 'can only unique arrays, not ' + nameType(input)

        let arr = Array.from(input).sort(compareValues)
        let ret = []
        for (let i = 0; i < arr.length; i++) {
            if (i === 0 || compareValues(arr[i], arr[i-1]) !== 0) {
                ret.push(arr[i])
            }
        }
        yield ret
    },
    'todate/0': function*(input) {
        let date;
        let t = nameType(input);

        if (t === 'number') {
            date = new Date(input * 1000);
        } else {
            throw 'todate/0 only takes numbers, not ' + t;
        }
        // jq does not include fractional seconds in these
        yield date.toISOString().slice(0, -5) + 'Z';
    },
    'fromdateiso8601/0': function*(input) {
        let date;
        let t = nameType(input);

        if (t === 'string') {
            date = new Date(input);
        } else {
            throw 'fromdate/0 only takes strings, not ' + t;
        }

        yield date / 1000;
    },
    'now/0': function*(input) {
        yield new Date() / 1000;
    },
    'builtins/0': function*(input) {
        yield Object.keys(functions);
    },
    'isinfinite/0': function*(input) {
        yield !Number.isFinite(input);
    },
    'isfinite/0': function*(input) {
        yield Number.isFinite(input);
    },
    'isnan/0': function*(input) {
        yield Number.isNaN(input);
    },
    'isnormal/0': function*(input) {
        yield Number.isFinite(input) && !Number.isNaN(input);
    },
    'infinite/0': function*(input) {
        yield Number.POSITIVE_INFINITY;
    },
    'nan/0': function*(input) {
        yield Number.NaN;
    },
    'endswith/1': function*(input, conf, args) {
        for (let v of args[0].apply(input, conf))
            yield input.endsWith(v);
    },
    'startswith/1': function*(input, conf, args) {
        for (let v of args[0].apply(input, conf))
            yield input.startsWith(v);
    },
    'not/0': function*(input) {
        yield !input;
    },
    'abs/0': function*(input) {
        if (compareValues(input, 0) < 0) {
            yield -input;
        } else {
            yield input;
        }
    },
    'max/0': function*(input) {
        let best = null;
        for (let o of input) {
            if (compareValues(o, best) > 0)
                best = o;
        }
        yield best;
    },
    'min/0': function*(input) {
        let best = undefined;
        for (let o of input) {
            if (typeof best === 'undefined')
                best = o;
            else if (compareValues(o, best) < 0)
                best = o;
        }
        if (typeof best === 'undefined') best = null;
        yield best;
    },
    'max_by/1': function*(input, conf, args) {
        let best = null;
        let best_by = null;
        for (let o of input) {
            const by = Array.from(args[0].apply(o, conf))
            if (best === null) {
                best = o;
                best_by = by;
            }
            // later values replace earlier ones for max_by in jq
            else if (compareValues(by, best_by) >= 0) {
                best = o;
                best_by = by;
            }
        }
        yield best;
    },
    'min_by/1': function*(input, conf, args) {
        let best = undefined;
        let best_by = null;
        for (let o of input) {
            const by = Array.from(args[0].apply(o, conf))
            if (typeof best === 'undefined') {
                best = o;
                best_by = by;
            }
            else if (compareValues(by, best_by) < 0) {
                best = o;
                best_by = by;
            }
        }
        yield best;
    },
    'indices/1': function*(input, conf, args) {
        const itype = nameType(input);
        if (itype == 'string') {
            for (let needle of args[0].apply(input, conf)) {
                let ret = [];
                let pos = input.indexOf(needle);
                while (pos >= 0) {
                    ret.push(pos);
                    pos = input.indexOf(needle, pos + 1);
                }
                yield ret;
            }
        } else if (itype == 'array') {
            for (let needle of args[0].apply(input, conf)) {
                let ret = [];
                if (nameType(needle) == 'array') {
                    outer: for (let i = 0; i < input.length - needle.length; i++) {
                        for (let j = 0; j < needle.length; j++)
                            if (compareValues(input[i + j], needle[j]) != 0)
                                continue outer;
                        ret.push(i);
                    }
                } else {
                    for (let i = 0; i < input.length; i++) {
                        if (compareValues(input[i], needle) == 0)
                            ret.push(i);
                    }
                }
                yield ret;
            }
        } else if (itype == 'object') {
            // This matches upstream behaviour, but no documentation or reason
            for (let needle of args[0].apply(input, conf))
                yield input[needle] ?? null;
        } else {
            throw 'cannot index ' + itype
        }
    },
    'index/1': function*(input, conf, args) {
        const itype = nameType(input);
        if (itype == 'string') {
            for (let needle of args[0].apply(input, conf)) {
                let pos = input.indexOf(needle);
                if (pos >= 0) yield pos; else yield null;
            }
        } else if (itype == 'array') {
            for (let needle of args[0].apply(input, conf)) {
                if (nameType(needle) == 'array') {
                    outer: for (let i = 0; i < input.length - needle.length; i++) {
                        for (let j = 0; j < needle.length; j++)
                            if (compareValues(input[i + j], needle[j]) != 0)
                                continue outer;
                        yield i;
                        break;
                    }
                } else {
                    let pos = input.findIndex(x => compareValues(x, needle) == 0);
                    if (pos >= 0) yield pos; else yield null;
                }
            }
        }
    },
    'rindex/1': function*(input, conf, args) {
        const itype = nameType(input);
        if (itype == 'string') {
            for (let needle of args[0].apply(input, conf)) {
                let pos = input.lastIndexOf(needle);
                if (pos >= 0) yield pos; else yield null;
            }
        } else if (itype == 'array') {
            for (let needle of args[0].apply(input, conf)) {
                if (nameType(needle) == 'array') {
                    outer: for (let i = input.length - needle.length - 1; i >= 0; i--) {
                        for (let j = 0; j < needle.length; j++)
                            if (compareValues(input[i + j], needle[j]) != 0)
                                continue outer;
                        yield i;
                        break;
                    }
                } else {
                    let pos = input.findLastIndex(x => compareValues(x, needle) == 0);
                    if (pos >= 0) yield pos; else yield null;
                }
            }
        }
    },
    'flatten/0': function*(input) {
        if (nameType(input) != 'array')
            throw 'can only flatten array, not ' + nameType(input);
        yield input.flat(Number.POSITIVE_INFINITY)
    },
    'flatten/1': function*(input, conf, args) {
        if (nameType(input) != 'array')
            throw 'can only flatten array, not ' + nameType(input);
        for (let depth of args[0].apply(input, conf))
            yield input.flat(depth);
    },
    'transpose/0': function*(input) {
        if (nameType(input) != 'array')
            throw 'can only transpose array, not ' + nameType(input);
        let size = Math.max(...input.map(x => x.length));
        let ret = [];
        for (let y = 0; y < size; y++) {
            let row = [];
            ret.push(row);
            for (let x = 0; x < size; x++)
                row.push(input[x][y] ?? null)
        }
        yield ret;
    },
    'combinations/0': function*(input) {
        function* helper(sofar, i) {
            let arr = input[i];
            if (arr === undefined)
                return yield sofar;
            for (let a of arr) {
                let pfx = [...sofar, a];
                yield* helper(pfx, i + 1);
            }
        }
        yield* helper([], 0);
    },
    'while/2': function*(input, conf, args) {
        const cond = args[0];
        const update = args[1];
        let queue = [input];
        while (queue.length) {
            input = queue.shift();
            for (let c of cond.apply(input, conf)) {
                if (!c)
                    continue;
                yield input;
                let outs = Array.from(update.apply(input, conf))
                queue.unshift(...outs);
            }
        }
    },
    'until/2': function*(input, conf, args) {
        const cond = args[0];
        const update = args[1];
        let queue = [input];
        while (queue.length) {
            input = queue.shift();
            for (let c of cond.apply(input, conf)) {
                if (c) {
                    yield input;
                    continue;
                }
                let outs = Array.from(update.apply(input, conf))
                queue.unshift(...outs);
            }
        }
    },
}

functions['match/2'] = functions['match/1'];
functions['todateiso8601/0'] = functions['todate/0'];
functions['fromdate/0'] = functions['fromdateiso8601/0'];

// Define mathematical functions jq supports that are in the JavaScript Math
// object. First, single-argument functions correspond to /0 functions on
// their input.
for (let mf of [ 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atanh', 'cbrt', 'ceil', 'cos', 'cosh', 'erf', 'erfc', 'exp', 'exp10', 'exp2', 'expm1', 'fabs', 'floor', 'gamma', 'j0', 'j1', 'lgamma', 'log', 'log10', 'log1p', 'log2', 'logb', 'nearbyint', 'rint', 'round', 'significand', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'tgamma', 'trunc', 'y0', 'y1']) {
    if (mf in Math) {
        functions[mf + '/0'] = function*(input) {
            yield Math[mf](input)
        }
    }
}
functions['fabs/0'] = function*(input) { yield Math.abs(input); }

// Two-argument functions correspond to /2 functions that ignore their input.
for (let mf of ['atan2', 'copysign', 'drem', 'fdim', 'fmax', 'fmin', 'fmod', 'frexp', 'hypot', 'jn', 'ldexp', 'modf', 'nextafter', 'nexttoward', 'pow', 'remainder', 'scalb', 'scalbln', 'yn']) {
    let mathName = mf;
    if (mf.startsWith('f') && !(mf in Math)) mathName = mf.substring(1);
    if (mathName in Math) {
        functions[mf + '/2'] = function*(input, conf, args) {
            for (let a1 of args[0].apply(input, conf))
                for (let a2 of args[1].apply(input, conf))
                    yield Math[mathName](a1, a2);
        }
    }
}

/**
 * Implements the general string substitution operation
 * 
 * replacementExpr is evaluated with an input object containing
 * keys for each named group in the expression and values for the
 * corresponding captured substrings.
 * 
 * With /g, the expression will be evaluated once for each match in
 * the string. When replacementExpr produces multiple values, the result is
 * one output string with all of the first-produced values, then one
 * with all of the second-produced values, and so on.
 * 
 * @param {any} input The input value to this pipeline step (string source)
 * @param {any} conf Configuration object
 * @param {any} regexpExpr A stream of strings to use as regular expressions
 * @param {any} replacementExpr A stream to evaluate for each replacement
 * @param {string} flags The flags to use for the regular expression
 * */
function* sub(input, conf, regexpExpr, replacementExpr, flags='') {
    flags = makeFlagString(flags);
    for (let regexp of regexpExpr.apply(input, conf)) {
        let re = new RegExp(regexp, flags);
        let match;
        let before = '';
        let lastIndex = 0;
        let bits = [];
        let groupCount = 0;
        while (match = re.exec(input)) {
            bits.push(input.slice(lastIndex, match.index))
            bits.push(match.groups);
            groupCount++;
            lastIndex = match.index + match[0].length;
            if (flags.indexOf('g') < 0)
                break;
        }
        if (bits.length == 0) {
            return yield input;
        }
        let finalPiece = input.slice(lastIndex);
        let results = [];
        for (let i = 0; i < bits.length; i += 2) {
            let before = bits[i];
            let groups = bits[i + 1];
            let these = [];
            results.push(these);
            for (let replacement of replacementExpr.apply(groups, conf)) {
                these.push(before + replacement);
            }
        }
        let index = 0;
        while (true) {
            let r = '';
            let anyPresent = false;
            for (let i = 0; i < results.length; i++) {
                if (typeof results[i][index] !== 'undefined')
                    anyPresent = true;
                r += results[i][index] ?? '';
            }
            if (!anyPresent)
                break;
            r += finalPiece;
            yield r;
            index++;
            if (index > 1000)
                break;
        }
    }
}

// Create a JavaScript RegExp flag string as best as possible
// out of a jq (Oniguruma) flag string.
// Always uses /u for whole-codepoint matching, and
// translates other flags where there are close analogues.
function makeFlagString(flags) {
    let flagParts = ['u'];
    if (flags === null)
        return 'u';
    for (let f of flags) {
        if (f == 'g' || f == 'i' || f == 'm' || f == 's') {
            flagParts.push(f);
        } else if (f == 'p') {
            flagParts.push('s', 'm');
        } else if (f == 'x' || f == 'l' || f == 'n') {
            throw `jqjs does not have support for regex flag '${f}'`;
        } else {
            throw `Invalid flag '${f}' in regex substitution`;
        }
    }
    return flagParts.join('');
}

// Implements the walk/1 algorithm, a depth-first post-order
// map over a JSON structure.
// When the provided function has multiple outputs, only the
// first output is used when setting an object's field values,
// but all are collected in other cases.
function* walk(input, conf, expr) {
    if (nameType(input) == 'array') {
        let arr = [];
        for (let v of input) {
            arr.push(...walk(v, conf, expr));
        }
        return yield* expr.apply(arr, conf);
    } else if (nameType(input) == 'object') {
        let obj = {};
        for (let k of Object.keys(input)) {
            for (let v of walk(input[k], conf, expr)) {
                obj[k] = v;
                break;
            }
        }
        return yield* expr.apply(obj, conf);
    }
    yield* expr.apply(input, conf);
}

// Implements the containment algorithm, returning whether haystack
// contains needle:
// * Strings are contained if they are substrings
// * Arrays if each element is contained in some element of other
// * Object if values contained by values in matching key
// * All others, if they are equal.
// This helper function is necessary because the recursive case
// has different error behaviour to the user-exposed function.
function containsHelper(haystack, needle) {
    let haystackType = nameType(haystack)
    let needleType = nameType(needle)
    if (haystackType != needleType) {
        return false
    } else if (haystackType == 'string') {
        return (haystack.indexOf(needle) != -1)
    } else if (haystackType == 'array') {
        for (let b of needle) {
            let found = false
            for (let a of haystack) {
                if (containsHelper(a, b)) {
                    found = true
                    break
                }
            }
            if (!found)
                return false
        }
        return true
    } else if (haystackType == 'object') {
        for (let k of Object.keys(needle)) {
            if (!haystack.hasOwnProperty(k))
                return false
            if (!containsHelper(haystack[k], needle[k]))
                return false
        }
        return true
    } else {
        return haystack === needle
    }
}

defineShorthandFunction('map', 'f', '[.[] | f]')
defineShorthandFunction('map_values', 'f', '.[] |= f')
defineShorthandFunction('del', 'p', 'p |= empty')
defineShorthandFunction('with_entries', 'w', 'to_entries | map(w) | from_entries')
defineShorthandFunction('arrays', '', 'select(type == "array")')
defineShorthandFunction('objects', '', 'select(type == "object")')
defineShorthandFunction('booleans', '', 'select(type == "boolean")')
defineShorthandFunction('strings', '', 'select(type == "string")')
defineShorthandFunction('numbers', '', 'select(type == "number")')
defineShorthandFunction('normals', '', 'select(type == "number" and isnormal)')
defineShorthandFunction('finites', '', 'select(type == "number" and isfinite)')
defineShorthandFunction('nulls', '', 'select(type == "null")')
defineShorthandFunction('values', '', 'select(type != "null")')
defineShorthandFunction('iterables', '', 'select(type == "array" or type == "object")')
defineShorthandFunction('scalars', '', 'select(type != "array" and type != "object")')
defineShorthandFunction('pick', ['pathexps'], '. as $in | reduce path(pathexps) as $a (null; setpath($a; $in|getpath($a)) )')
defineShorthandFunction('recurse', [], 'recurse(.[]?; true)')
defineShorthandFunction('recurse', 'f', 'recurse(f; true)')
defineShorthandFunction('unique_by', 'f', 'group_by(f) | map(.[0])')
defineShorthandFunction('combinations', 'n', '. as $input | [ range(n) | $input ] | combinations');
defineShorthandFunction('paths', [], 'path(..)|select(length > 0)')
defineShorthandFunction('paths', 'f', 'path(..|select(f))|select(length > 0)')
defineShorthandFunction('scan', 'e', 'scan(e; "")')
// SQL-style operators
defineShorthandFunction('INDEX', 'f', '[ .[] | {(f): .} ] | add')
defineShorthandFunction('INDEX', ['stream', 'f'], '[ stream | {(f): .} ] | add')
defineShorthandFunction('JOIN', ['idx', 'stream', 'idx_expr', 'join_expr'], 'idx as $idx | stream | idx_expr as $key | [ ., $idx[$key] ] | join_expr')
defineShorthandFunction('JOIN', ['idx', 'stream', 'idx_expr'], 'idx as $idx | stream | [., $idx[idx_expr]]')
defineShorthandFunction('JOIN', ['idx', 'idx_expr'], 'idx as $idx | [.[] | [., $idx[idx_expr]]]')
defineShorthandFunction('IN', 's', 'any(s == .; .)')
defineShorthandFunction('IN', ['source', 's'], 'any(source == s; .)')


/**
 * @typedef {JQPrimitive | ?JQObject | JQArray} JQValue
 * @typedef {string | number | boolean} JQPrimitive
 * @typedef {Object.<string, JQPrimitive>} JQObject
 * @typedef {Array<JQValue>} JQArray
 */

/**
 * @overload
 * @param {string} prog
 * @returns {(input: JQValue) => IterableIterator<JQValue>}
 *
 * @overload
 * @param {string} prog
 * @param {JQValue} input
 * @returns {IterableIterator<JQValue>}
 *
 * @overload
 * @param {string[]} prog
 * @param {any?} input
 * @param {any[]?} rest
 * @returns {(input: JQValue) => IterableIterator<JQValue>}
 */
function combined(prog, input, ...rest) {
    if (nameType(prog) == 'array') {
        // tag string jq`...`
        const collected = [];
        rest.unshift(input);
        for (let i = 0; i < prog.length; i++) {
            collected.push(prog.raw[i]);
            if (rest[i] !== undefined)
                collected.push(JSON.stringify(rest[i]));
        }
        return compile(collected.join(''));
    } else {
        let filter = compile(prog)
        if (typeof input !== 'undefined') {
            return filter(input)
        } else {
            return filter
        }
    }
}

const jq = Object.assign(combined, {compile, prettyPrint})
// Delete these two lines for a non-module version (CORS-safe)
export { compile, prettyPrint, compileNode, formats }
export default jq
