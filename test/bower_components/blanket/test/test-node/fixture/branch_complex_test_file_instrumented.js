if (typeof _$jscoverage === 'undefined') _$jscoverage = {};
var _$branchFcn=function(f,l,c,r){ if (!!r) { _$jscoverage[f].branchData[l][c][0] = _$jscoverage[f].branchData[l][c][0] || [];_$jscoverage[f].branchData[l][c][0].push(r); }else { _$jscoverage[f].branchData[l][c][1] = _$jscoverage[f].branchData[l][c][1] || [];_$jscoverage[f].branchData[l][c][1].push(r); }return r;};
if (typeof _$jscoverage['branch_complex_test_file'] === 'undefined'){_$jscoverage['branch_complex_test_file']=[];
_$jscoverage['branch_complex_test_file'].branchData=[];
_$jscoverage['branch_complex_test_file'].source=['function COMPLEXBRANCHTEST(x,y,z){',
'return x === 1 ? true : y === 2 ? z === 3 ? true : false : false;',
'}'];
_$jscoverage['branch_complex_test_file'][1]=0;
_$jscoverage['branch_complex_test_file'][2]=0;
if (typeof _$jscoverage['branch_complex_test_file'].branchData[2] === 'undefined'){
_$jscoverage['branch_complex_test_file'].branchData[2]=[];
}_$jscoverage['branch_complex_test_file'].branchData[2][7] = [];
_$jscoverage['branch_complex_test_file'].branchData[2][7].consequent = {"start":{"line":2,"column":17},"end":{"line":2,"column":21}};
_$jscoverage['branch_complex_test_file'].branchData[2][7].alternate = {"start":{"line":2,"column":24},"end":{"line":2,"column":64}};
if (typeof _$jscoverage['branch_complex_test_file'].branchData[2] === 'undefined'){
_$jscoverage['branch_complex_test_file'].branchData[2]=[];
}_$jscoverage['branch_complex_test_file'].branchData[2][24] = [];
_$jscoverage['branch_complex_test_file'].branchData[2][24].consequent = {"start":{"line":2,"column":34},"end":{"line":2,"column":56}};
_$jscoverage['branch_complex_test_file'].branchData[2][24].alternate = {"start":{"line":2,"column":59},"end":{"line":2,"column":64}};
if (typeof _$jscoverage['branch_complex_test_file'].branchData[2] === 'undefined'){
_$jscoverage['branch_complex_test_file'].branchData[2]=[];
}_$jscoverage['branch_complex_test_file'].branchData[2][34] = [];
_$jscoverage['branch_complex_test_file'].branchData[2][34].consequent = {"start":{"line":2,"column":44},"end":{"line":2,"column":48}};
_$jscoverage['branch_complex_test_file'].branchData[2][34].alternate = {"start":{"line":2,"column":51},"end":{"line":2,"column":56}};
}_$jscoverage['branch_complex_test_file'][1]++;
function COMPLEXBRANCHTEST(x,y,z){
_$jscoverage['branch_complex_test_file'][2]++;
return _$branchFcn('branch_complex_test_file',2,7,x === 1 )? true : _$branchFcn('branch_complex_test_file',2,24,y === 2 )? _$branchFcn('branch_complex_test_file',2,34,z === 3 )? true : false : false;
}