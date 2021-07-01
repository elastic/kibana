aug QFClose
  au!
  au BufEnter * call CloseQf()
aug END

function! CloseQf() 
  if &buftype != "quickfix"
    :cclose
  endif
endfunction
