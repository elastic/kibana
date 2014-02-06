if (typeof _$jscoverage === 'undefined') _$jscoverage = {};
var _$branchFcn=function(f,l,c,r){ if (!!r) { _$jscoverage[f].branchData[l][c][0] = _$jscoverage[f].branchData[l][c][0] || [];_$jscoverage[f].branchData[l][c][0].push(r); }else { _$jscoverage[f].branchData[l][c][1] = _$jscoverage[f].branchData[l][c][1] || [];_$jscoverage[f].branchData[l][c][1].push(r); }return r;};
if (typeof _$jscoverage['multi_line_branch_test_file'] === 'undefined'){_$jscoverage['multi_line_branch_test_file']=[];
_$jscoverage['multi_line_branch_test_file'].branchData=[];
_$jscoverage['multi_line_branch_test_file'].source=['function MULTIBRANCHTEST(x){',
'return x === 1 ?',
'    true :',
'    false;',
'}'];
_$jscoverage['multi_line_branch_test_file'][1]=0;
_$jscoverage['multi_line_branch_test_file'][2]=0;
if (typeof _$jscoverage['multi_line_branch_test_file'].branchData[2] === 'undefined'){
_$jscoverage['multi_line_branch_test_file'].branchData[2]=[];
}_$jscoverage['multi_line_branch_test_file'].branchData[2][7] = [];
_$jscoverage['multi_line_branch_test_file'].branchData[2][7].consequent = {"start":{"line":3,"column":4},"end":{"line":3,"column":8}};
_$jscoverage['multi_line_branch_test_file'].branchData[2][7].alternate = {"start":{"line":4,"column":4},"end":{"line":4,"column":9}};
}_$jscoverage['multi_line_branch_test_file'][1]++;
function MULTIBRANCHTEST(x){
_$jscoverage['multi_line_branch_test_file'][2]++;
return _$branchFcn('multi_line_branch_test_file',2,7,x === 1 )?
    true :
    false;
}