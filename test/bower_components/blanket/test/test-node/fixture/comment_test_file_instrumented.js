if (typeof _$jscoverage === 'undefined') _$jscoverage = {};
if (typeof _$jscoverage['comment_test_file'] === 'undefined'){_$jscoverage['comment_test_file']=[];
_$jscoverage['comment_test_file'].source=['// this is a comment',
'console.log("this should be instrumented.");',
'// this is another comment',
'console.log("this should also be instrumented");',
'/* longer comment */',
'console.log("another instrumented line.");',
'// a multiline',
'// comment',
'console.log("yet another");',
'/* another',
'   multiline',
'   comment',
'   */',
'console.log("final line");'];
_$jscoverage['comment_test_file'][2]=0;
_$jscoverage['comment_test_file'][4]=0;
_$jscoverage['comment_test_file'][6]=0;
_$jscoverage['comment_test_file'][9]=0;
_$jscoverage['comment_test_file'][14]=0;
}// this is a comment
_$jscoverage['comment_test_file'][2]++;
console.log("this should be instrumented.");
// this is another comment
_$jscoverage['comment_test_file'][4]++;
console.log("this should also be instrumented");
/* longer comment */
_$jscoverage['comment_test_file'][6]++;
console.log("another instrumented line.");
// a multiline
// comment
_$jscoverage['comment_test_file'][9]++;
console.log("yet another");
/* another
   multiline
   comment
   */
_$jscoverage['comment_test_file'][14]++;
console.log("final line");