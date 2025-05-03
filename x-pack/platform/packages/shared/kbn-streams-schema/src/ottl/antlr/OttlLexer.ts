// Generated from src/ottl/antlr/ottl.g4 by ANTLR 4.13.2
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols
import {
	ATN,
	ATNDeserializer,
	CharStream,
	DecisionState, DFA,
	Lexer,
	LexerATNSimulator,
	RuleContext,
	PredictionContextCache,
	Token
} from "antlr4";
export default class ottlLexer extends Lexer {
	public static readonly WHERE = 1;
	public static readonly NIL = 2;
	public static readonly TRUE = 3;
	public static readonly FALSE = 4;
	public static readonly NOT = 5;
	public static readonly OR = 6;
	public static readonly AND = 7;
	public static readonly GTE = 8;
	public static readonly LTE = 9;
	public static readonly EQ = 10;
	public static readonly NE = 11;
	public static readonly GT = 12;
	public static readonly LT = 13;
	public static readonly PLUS = 14;
	public static readonly MINUS = 15;
	public static readonly STAR = 16;
	public static readonly SLASH = 17;
	public static readonly EQUAL = 18;
	public static readonly DOT = 19;
	public static readonly COMMA = 20;
	public static readonly COLON = 21;
	public static readonly LPAREN = 22;
	public static readonly RPAREN = 23;
	public static readonly LBRACK = 24;
	public static readonly RBRACK = 25;
	public static readonly LBRACE = 26;
	public static readonly RBRACE = 27;
	public static readonly BYTES = 28;
	public static readonly FLOAT = 29;
	public static readonly INT = 30;
	public static readonly STRING = 31;
	public static readonly UPPERCASE_IDENTIFIER = 32;
	public static readonly LOWERCASE_IDENTIFIER = 33;
	public static readonly WHITESPACE = 34;
	public static readonly EOF = Token.EOF;

	public static readonly channelNames: string[] = [ "DEFAULT_TOKEN_CHANNEL", "HIDDEN" ];
	public static readonly literalNames: (string | null)[] = [ null, "'where'", 
                                                            "'nil'", "'true'", 
                                                            "'false'", "'not'", 
                                                            "'or'", "'and'", 
                                                            "'>='", "'<='", 
                                                            "'=='", "'!='", 
                                                            "'>'", "'<'", 
                                                            "'+'", "'-'", 
                                                            "'*'", "'/'", 
                                                            "'='", "'.'", 
                                                            "','", "':'", 
                                                            "'('", "')'", 
                                                            "'['", "']'", 
                                                            "'{'", "'}'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "WHERE", 
                                                             "NIL", "TRUE", 
                                                             "FALSE", "NOT", 
                                                             "OR", "AND", 
                                                             "GTE", "LTE", 
                                                             "EQ", "NE", 
                                                             "GT", "LT", 
                                                             "PLUS", "MINUS", 
                                                             "STAR", "SLASH", 
                                                             "EQUAL", "DOT", 
                                                             "COMMA", "COLON", 
                                                             "LPAREN", "RPAREN", 
                                                             "LBRACK", "RBRACK", 
                                                             "LBRACE", "RBRACE", 
                                                             "BYTES", "FLOAT", 
                                                             "INT", "STRING", 
                                                             "UPPERCASE_IDENTIFIER", 
                                                             "LOWERCASE_IDENTIFIER", 
                                                             "WHITESPACE" ];
	public static readonly modeNames: string[] = [ "DEFAULT_MODE", ];

	public static readonly ruleNames: string[] = [
		"WHERE", "NIL", "TRUE", "FALSE", "NOT", "OR", "AND", "GTE", "LTE", "EQ", 
		"NE", "GT", "LT", "PLUS", "MINUS", "STAR", "SLASH", "EQUAL", "DOT", "COMMA", 
		"COLON", "LPAREN", "RPAREN", "LBRACK", "RBRACK", "LBRACE", "RBRACE", "BYTES", 
		"FLOAT", "INT", "STRING", "UPPERCASE_IDENTIFIER", "LOWERCASE_IDENTIFIER", 
		"WHITESPACE",
	];


	constructor(input: CharStream) {
		super(input);
		this._interp = new LexerATNSimulator(this, ottlLexer._ATN, ottlLexer.DecisionsToDFA, new PredictionContextCache());
	}

	public get grammarFileName(): string { return "ottl.g4"; }

	public get literalNames(): (string | null)[] { return ottlLexer.literalNames; }
	public get symbolicNames(): (string | null)[] { return ottlLexer.symbolicNames; }
	public get ruleNames(): string[] { return ottlLexer.ruleNames; }

	public get serializedATN(): number[] { return ottlLexer._serializedATN; }

	public get channelNames(): string[] { return ottlLexer.channelNames; }

	public get modeNames(): string[] { return ottlLexer.modeNames; }

	public static readonly _serializedATN: number[] = [4,0,34,219,6,-1,2,0,
	7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,
	7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,
	16,2,17,7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,
	2,24,7,24,2,25,7,25,2,26,7,26,2,27,7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,
	31,7,31,2,32,7,32,2,33,7,33,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,2,
	1,2,1,2,1,2,1,2,1,3,1,3,1,3,1,3,1,3,1,3,1,4,1,4,1,4,1,4,1,5,1,5,1,5,1,6,
	1,6,1,6,1,6,1,7,1,7,1,7,1,8,1,8,1,8,1,9,1,9,1,9,1,10,1,10,1,10,1,11,1,11,
	1,12,1,12,1,13,1,13,1,14,1,14,1,15,1,15,1,16,1,16,1,17,1,17,1,18,1,18,1,
	19,1,19,1,20,1,20,1,21,1,21,1,22,1,22,1,23,1,23,1,24,1,24,1,25,1,25,1,26,
	1,26,1,27,1,27,1,27,1,27,4,27,150,8,27,11,27,12,27,151,1,28,3,28,155,8,
	28,1,28,5,28,158,8,28,10,28,12,28,161,9,28,1,28,1,28,4,28,165,8,28,11,28,
	12,28,166,1,28,1,28,3,28,171,8,28,1,28,4,28,174,8,28,11,28,12,28,175,3,
	28,178,8,28,1,29,3,29,181,8,29,1,29,4,29,184,8,29,11,29,12,29,185,1,30,
	1,30,1,30,1,30,5,30,192,8,30,10,30,12,30,195,9,30,1,30,1,30,1,31,1,31,5,
	31,201,8,31,10,31,12,31,204,9,31,1,32,1,32,5,32,208,8,32,10,32,12,32,211,
	9,32,1,33,4,33,214,8,33,11,33,12,33,215,1,33,1,33,0,0,34,1,1,3,2,5,3,7,
	4,9,5,11,6,13,7,15,8,17,9,19,10,21,11,23,12,25,13,27,14,29,15,31,16,33,
	17,35,18,37,19,39,20,41,21,43,22,45,23,47,24,49,25,51,26,53,27,55,28,57,
	29,59,30,61,31,63,32,65,33,67,34,1,0,9,3,0,48,57,65,70,97,102,2,0,43,43,
	45,45,1,0,48,57,2,0,69,69,101,101,2,0,34,34,92,92,1,0,65,90,4,0,48,57,65,
	90,95,95,97,122,1,0,97,122,3,0,9,10,13,13,32,32,232,0,1,1,0,0,0,0,3,1,0,
	0,0,0,5,1,0,0,0,0,7,1,0,0,0,0,9,1,0,0,0,0,11,1,0,0,0,0,13,1,0,0,0,0,15,
	1,0,0,0,0,17,1,0,0,0,0,19,1,0,0,0,0,21,1,0,0,0,0,23,1,0,0,0,0,25,1,0,0,
	0,0,27,1,0,0,0,0,29,1,0,0,0,0,31,1,0,0,0,0,33,1,0,0,0,0,35,1,0,0,0,0,37,
	1,0,0,0,0,39,1,0,0,0,0,41,1,0,0,0,0,43,1,0,0,0,0,45,1,0,0,0,0,47,1,0,0,
	0,0,49,1,0,0,0,0,51,1,0,0,0,0,53,1,0,0,0,0,55,1,0,0,0,0,57,1,0,0,0,0,59,
	1,0,0,0,0,61,1,0,0,0,0,63,1,0,0,0,0,65,1,0,0,0,0,67,1,0,0,0,1,69,1,0,0,
	0,3,75,1,0,0,0,5,79,1,0,0,0,7,84,1,0,0,0,9,90,1,0,0,0,11,94,1,0,0,0,13,
	97,1,0,0,0,15,101,1,0,0,0,17,104,1,0,0,0,19,107,1,0,0,0,21,110,1,0,0,0,
	23,113,1,0,0,0,25,115,1,0,0,0,27,117,1,0,0,0,29,119,1,0,0,0,31,121,1,0,
	0,0,33,123,1,0,0,0,35,125,1,0,0,0,37,127,1,0,0,0,39,129,1,0,0,0,41,131,
	1,0,0,0,43,133,1,0,0,0,45,135,1,0,0,0,47,137,1,0,0,0,49,139,1,0,0,0,51,
	141,1,0,0,0,53,143,1,0,0,0,55,145,1,0,0,0,57,154,1,0,0,0,59,180,1,0,0,0,
	61,187,1,0,0,0,63,198,1,0,0,0,65,205,1,0,0,0,67,213,1,0,0,0,69,70,5,119,
	0,0,70,71,5,104,0,0,71,72,5,101,0,0,72,73,5,114,0,0,73,74,5,101,0,0,74,
	2,1,0,0,0,75,76,5,110,0,0,76,77,5,105,0,0,77,78,5,108,0,0,78,4,1,0,0,0,
	79,80,5,116,0,0,80,81,5,114,0,0,81,82,5,117,0,0,82,83,5,101,0,0,83,6,1,
	0,0,0,84,85,5,102,0,0,85,86,5,97,0,0,86,87,5,108,0,0,87,88,5,115,0,0,88,
	89,5,101,0,0,89,8,1,0,0,0,90,91,5,110,0,0,91,92,5,111,0,0,92,93,5,116,0,
	0,93,10,1,0,0,0,94,95,5,111,0,0,95,96,5,114,0,0,96,12,1,0,0,0,97,98,5,97,
	0,0,98,99,5,110,0,0,99,100,5,100,0,0,100,14,1,0,0,0,101,102,5,62,0,0,102,
	103,5,61,0,0,103,16,1,0,0,0,104,105,5,60,0,0,105,106,5,61,0,0,106,18,1,
	0,0,0,107,108,5,61,0,0,108,109,5,61,0,0,109,20,1,0,0,0,110,111,5,33,0,0,
	111,112,5,61,0,0,112,22,1,0,0,0,113,114,5,62,0,0,114,24,1,0,0,0,115,116,
	5,60,0,0,116,26,1,0,0,0,117,118,5,43,0,0,118,28,1,0,0,0,119,120,5,45,0,
	0,120,30,1,0,0,0,121,122,5,42,0,0,122,32,1,0,0,0,123,124,5,47,0,0,124,34,
	1,0,0,0,125,126,5,61,0,0,126,36,1,0,0,0,127,128,5,46,0,0,128,38,1,0,0,0,
	129,130,5,44,0,0,130,40,1,0,0,0,131,132,5,58,0,0,132,42,1,0,0,0,133,134,
	5,40,0,0,134,44,1,0,0,0,135,136,5,41,0,0,136,46,1,0,0,0,137,138,5,91,0,
	0,138,48,1,0,0,0,139,140,5,93,0,0,140,50,1,0,0,0,141,142,5,123,0,0,142,
	52,1,0,0,0,143,144,5,125,0,0,144,54,1,0,0,0,145,146,5,48,0,0,146,147,5,
	120,0,0,147,149,1,0,0,0,148,150,7,0,0,0,149,148,1,0,0,0,150,151,1,0,0,0,
	151,149,1,0,0,0,151,152,1,0,0,0,152,56,1,0,0,0,153,155,7,1,0,0,154,153,
	1,0,0,0,154,155,1,0,0,0,155,159,1,0,0,0,156,158,7,2,0,0,157,156,1,0,0,0,
	158,161,1,0,0,0,159,157,1,0,0,0,159,160,1,0,0,0,160,162,1,0,0,0,161,159,
	1,0,0,0,162,164,5,46,0,0,163,165,7,2,0,0,164,163,1,0,0,0,165,166,1,0,0,
	0,166,164,1,0,0,0,166,167,1,0,0,0,167,177,1,0,0,0,168,170,7,3,0,0,169,171,
	7,1,0,0,170,169,1,0,0,0,170,171,1,0,0,0,171,173,1,0,0,0,172,174,7,2,0,0,
	173,172,1,0,0,0,174,175,1,0,0,0,175,173,1,0,0,0,175,176,1,0,0,0,176,178,
	1,0,0,0,177,168,1,0,0,0,177,178,1,0,0,0,178,58,1,0,0,0,179,181,7,1,0,0,
	180,179,1,0,0,0,180,181,1,0,0,0,181,183,1,0,0,0,182,184,7,2,0,0,183,182,
	1,0,0,0,184,185,1,0,0,0,185,183,1,0,0,0,185,186,1,0,0,0,186,60,1,0,0,0,
	187,193,5,34,0,0,188,189,5,92,0,0,189,192,9,0,0,0,190,192,8,4,0,0,191,188,
	1,0,0,0,191,190,1,0,0,0,192,195,1,0,0,0,193,191,1,0,0,0,193,194,1,0,0,0,
	194,196,1,0,0,0,195,193,1,0,0,0,196,197,5,34,0,0,197,62,1,0,0,0,198,202,
	7,5,0,0,199,201,7,6,0,0,200,199,1,0,0,0,201,204,1,0,0,0,202,200,1,0,0,0,
	202,203,1,0,0,0,203,64,1,0,0,0,204,202,1,0,0,0,205,209,7,7,0,0,206,208,
	7,6,0,0,207,206,1,0,0,0,208,211,1,0,0,0,209,207,1,0,0,0,209,210,1,0,0,0,
	210,66,1,0,0,0,211,209,1,0,0,0,212,214,7,8,0,0,213,212,1,0,0,0,214,215,
	1,0,0,0,215,213,1,0,0,0,215,216,1,0,0,0,216,217,1,0,0,0,217,218,6,33,0,
	0,218,68,1,0,0,0,15,0,151,154,159,166,170,175,177,180,185,191,193,202,209,
	215,1,6,0,0];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!ottlLexer.__ATN) {
			ottlLexer.__ATN = new ATNDeserializer().deserialize(ottlLexer._serializedATN);
		}

		return ottlLexer.__ATN;
	}


	static DecisionsToDFA = ottlLexer._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );
}